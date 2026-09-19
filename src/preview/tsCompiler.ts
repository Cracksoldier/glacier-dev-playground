import ts from "typescript";
import type { ExecutionMode, ScriptLanguage } from "../models/project";
import { decodeOutputLineToSourceLine } from "./sourceMapLineMapping";
import { createTsCompilerHost } from "./tsCompilerHost";
import { createModuleResolver } from "./tsModuleResolution";
import type { TsDiagnostic } from "./tsWorkerProtocol";

export interface TsCompileResult {
  diagnostics: TsDiagnostic[];
  /** Non-null exactly when no `category: "error"` diagnostic was produced — the sole "safe to execute" signal, not the absence of thrown errors. */
  emittedJs: string | null;
  /** Only populated for TypeScript source (see `sourceMapLineMapping.ts`); JS-mode execution always uses the authored source verbatim, so its emit is diagnostic-only and never needs a line map. */
  lineMap: (number | undefined)[] | null;
}

export interface CompileScriptOptions {
  scriptLanguage: ScriptLanguage;
  executionMode: ExecutionMode;
}

const ROOT_FILE_NAME_BY_LANGUAGE: Record<ScriptLanguage, string> = {
  typescript: "root.ts",
  javascript: "root.js",
};

/**
 * Not a real `TSxxxx` compiler diagnostic code — this project's own
 * business rule (spec: "classic mode shall reject top-level import/export
 * syntax") has no TypeScript-checker equivalent, since `import`/`export` is
 * ordinary valid syntax in any module-mode compile.
 */
const CLASSIC_MODE_IMPORT_EXPORT_MESSAGE =
  '"import"/"export" statements are not allowed in classic script mode. Switch to module mode, or remove this statement.';

function convertTsDiagnostic(diagnostic: ts.Diagnostic): TsDiagnostic {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  const category: TsDiagnostic["category"] =
    diagnostic.category === ts.DiagnosticCategory.Error ? "error" : "warning";
  if (diagnostic.file === undefined || diagnostic.start === undefined) {
    return { message, category };
  }
  const { line, character } = ts.getLineAndCharacterOfPosition(
    diagnostic.file,
    diagnostic.start,
  );
  return { message, category, line: line + 1, column: character + 1 };
}

/**
 * `export const x = 1` / `export function f() {}` etc. aren't
 * `ExportDeclaration` nodes — they're an ordinary statement carrying an
 * `export` modifier — so those need a separate modifier check alongside the
 * `import`/re-export (`export { x }`, `export * from`) node-kind checks.
 */
function hasExportModifier(statement: ts.Statement): boolean {
  return (
    ts.canHaveModifiers(statement) &&
    (ts.getModifiers(statement) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

/** Top-level-only, matching the spec's "reject top-level import/export syntax" — nested re-exports etc. aren't legal syntax outside module context anyway. */
function findClassicModeViolations(sourceFile: ts.SourceFile): TsDiagnostic[] {
  const violations: TsDiagnostic[] = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) ||
      ts.isExportDeclaration(statement) ||
      ts.isExportAssignment(statement) ||
      ts.isImportEqualsDeclaration(statement) ||
      hasExportModifier(statement)
    ) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        sourceFile,
        statement.getStart(sourceFile),
      );
      violations.push({
        message: CLASSIC_MODE_IMPORT_EXPORT_MESSAGE,
        category: "error",
        line: line + 1,
        column: character + 1,
      });
    }
  }
  return violations;
}

/**
 * Compiles a single script source (JS or TS, classic or module execution
 * mode) via the TypeScript compiler API against a no-filesystem
 * `CompilerHost` (`tsCompilerHost.ts`; `es2022`+`dom`+`dom.iterable` libs
 * from `tsLibSources.ts`). Deliberately a plain importable function (not
 * tied to `self.onmessage`/Worker glue) so it's directly unit-testable
 * under Node/Vitest with real compiles — see `tsCompiler.worker.ts` for the
 * thin Worker wrapper around this.
 *
 * `checkJs` stays `false`: `program.getSemanticDiagnostics` naturally no-ops
 * for a plain JS root file under this setting, so JS projects still get
 * real syntactic (parse-error) diagnostics with no manual JS/TS branching
 * needed for the semantic pass.
 */
export function compileScript(
  source: string,
  options: CompileScriptOptions,
): TsCompileResult {
  const rootFileName = ROOT_FILE_NAME_BY_LANGUAGE[options.scriptLanguage];
  const moduleResolver = createModuleResolver();
  const { host, getEmittedJs, getEmittedMap } = createTsCompilerHost(
    rootFileName,
    source,
    moduleResolver,
  );

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    esModuleInterop: true,
    allowJs: true,
    checkJs: false,
    // The raw Compiler API (unlike tsc/tsconfig) defaults every strict-family
    // flag to on when `strict` is left unset, which would block casual,
    // loosely-typed playground code (e.g. `document.getElementById(x).textContent = y`
    // with no null check) on `strictNullChecks` errors. This is a lightweight
    // CodePen-style tool, not a strict-mode-enforcing environment for user
    // code, so strict checking is explicitly disabled here.
    strict: false,
    skipLibCheck: true,
    sourceMap: options.scriptLanguage === "typescript",
    // JS input emits to the same ".js" extension as its source, which
    // without an outDir would make the computed output path literally
    // equal the input path ("root.js" -> "root.js") — TypeScript treats
    // that as a self-overwrite and silently blocks the write (no
    // diagnostic, `writeFile` just never gets called). An arbitrary
    // distinct outDir sidesteps the collision for every script language.
    outDir: "/out",
  };

  const program = ts.createProgram({
    rootNames: [rootFileName],
    options: compilerOptions,
    host,
  });

  const sourceFile = program.getSourceFile(rootFileName);
  if (!sourceFile) {
    throw new Error(
      `compileScript: CompilerHost produced no source file for "${rootFileName}".`,
    );
  }

  const classicModeDiagnostics: TsDiagnostic[] =
    options.executionMode === "classic"
      ? findClassicModeViolations(sourceFile)
      : [];
  const syntacticDiagnostics = program
    .getSyntacticDiagnostics(sourceFile)
    .map(convertTsDiagnostic);
  const semanticDiagnostics = program
    .getSemanticDiagnostics(sourceFile)
    .map(convertTsDiagnostic);
  const remoteImportWarnings: TsDiagnostic[] = moduleResolver
    .resolvedRemoteSpecifiers()
    .map((specifier) => ({
      message: `Types for '${specifier}' are unavailable — treated as \`any\`.`,
      category: "warning" as const,
    }));

  const diagnostics = [
    ...classicModeDiagnostics,
    ...syntacticDiagnostics,
    ...semanticDiagnostics,
    ...remoteImportWarnings,
  ];

  if (diagnostics.some((diagnostic) => diagnostic.category === "error")) {
    return { diagnostics, emittedJs: null, lineMap: null };
  }

  const emitResult = program.emit(sourceFile);
  const allDiagnostics = [
    ...diagnostics,
    ...emitResult.diagnostics.map(convertTsDiagnostic),
  ];
  const emittedMap = getEmittedMap();
  const lineMap =
    options.scriptLanguage === "typescript" && emittedMap !== null
      ? decodeOutputLineToSourceLine(emittedMap)
      : null;

  return { diagnostics: allDiagnostics, emittedJs: getEmittedJs(), lineMap };
}
