import type { ProjectSource } from "../models/project";
import {
  createScssCompilerClient,
  type ScssCompilerClient,
} from "../preview/scssCompilerClient";
import {
  createTsCompilerClient,
  type TsCompilerClient,
} from "../preview/tsCompilerClient";
import type { TsDiagnostic } from "../preview/tsWorkerProtocol";

export type CompileForExportResult =
  | { status: "ok"; resolvedSource: ProjectSource }
  | { status: "scss-error"; message: string }
  | { status: "script-error"; diagnostics: TsDiagnostic[] };

export interface CompileForExportDependencies {
  createScssClient: () => ScssCompilerClient;
  createTsClient: () => TsCompilerClient;
}

const defaultDependencies: CompileForExportDependencies = {
  createScssClient: createScssCompilerClient,
  createTsClient: createTsCompilerClient,
};

interface StylesheetOutcome {
  ok: boolean;
  css?: string;
  message?: string;
}

interface ScriptOutcome {
  ok: boolean;
  emittedJs?: string;
  diagnostics?: TsDiagnostic[];
}

async function compileStylesheet(
  source: ProjectSource,
  createScssClient: () => ScssCompilerClient,
): Promise<StylesheetOutcome> {
  if (source.stylesheetLanguage !== "scss") {
    return { ok: true };
  }

  const client = createScssClient();
  try {
    const result = await client.compile(source.stylesheet, "export");
    if (result.type === "failure") {
      return { ok: false, message: result.error.message };
    }
    return { ok: true, css: result.css };
  } finally {
    client.dispose();
  }
}

async function compileScript(
  source: ProjectSource,
  createTsClient: () => TsCompilerClient,
): Promise<ScriptOutcome> {
  if (source.scriptLanguage !== "typescript") {
    return { ok: true };
  }

  const client = createTsClient();
  try {
    const result = await client.compile(
      source.script,
      source.scriptLanguage,
      source.executionMode,
      "export",
    );
    if (result.diagnostics.some((d) => d.category === "error")) {
      return { ok: false, diagnostics: result.diagnostics };
    }
    return { ok: true, emittedJs: result.emittedJs ?? undefined };
  } finally {
    client.dispose();
  }
}

export async function compileProjectSourceForExport(
  source: ProjectSource,
  dependencies: CompileForExportDependencies = defaultDependencies,
): Promise<CompileForExportResult> {
  const [stylesheetOutcome, scriptOutcome] = await Promise.all([
    compileStylesheet(source, dependencies.createScssClient),
    compileScript(source, dependencies.createTsClient),
  ]);

  if (!stylesheetOutcome.ok) {
    return {
      status: "scss-error",
      message: stylesheetOutcome.message ?? "SCSS compile failed.",
    };
  }

  if (!scriptOutcome.ok) {
    return {
      status: "script-error",
      diagnostics: scriptOutcome.diagnostics ?? [],
    };
  }

  const resolvedSource: ProjectSource = {
    ...source,
    stylesheet: stylesheetOutcome.css ?? source.stylesheet,
    script: scriptOutcome.emittedJs ?? source.script,
  };

  return { status: "ok", resolvedSource };
}
