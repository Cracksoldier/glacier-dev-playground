import ts from "typescript";
import { TS_DEFAULT_LIB_FILE_NAME, TS_LIB_SOURCES } from "./tsLibSources";
import {
  buildRemoteModuleDeclarationText,
  isRemoteModuleFileName,
  type ModuleResolver,
  remoteModuleSpecifierFromFileName,
} from "./tsModuleResolution";

/**
 * Lazily-populated, module-level cache of parsed lib `.d.ts` source files —
 * shared across every `createTsCompilerHost` call for this worker's
 * lifetime, since the lib text itself never changes between compiles. Only
 * the root file is re-parsed fresh per call; see `tsCompiler.ts`.
 */
const libSourceFileCache = new Map<string, ts.SourceFile>();

function getLibSourceFile(libFileName: string): ts.SourceFile | undefined {
  const cached = libSourceFileCache.get(libFileName);
  if (cached) return cached;
  const text = TS_LIB_SOURCES.get(libFileName);
  if (text === undefined) return undefined;
  const sourceFile = ts.createSourceFile(
    libFileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  libSourceFileCache.set(libFileName, sourceFile);
  return sourceFile;
}

/**
 * The lib/remote-module file-name matching in `getSourceFile`/`fileExists`
 * compares basenames rather than full paths — TypeScript resolves lib
 * references via `getDefaultLibFileName`/`getDefaultLibLocation` combined
 * with `getCurrentDirectory()`, and this host has no real filesystem for
 * those to agree on ahead of time, so matching on the trailing path segment
 * sidesteps needing to replicate TS's internal path-joining exactly.
 */
function basename(fileName: string): string {
  const lastSlash = fileName.lastIndexOf("/");
  return lastSlash === -1 ? fileName : fileName.slice(lastSlash + 1);
}

function scriptKindForRootFileName(rootFileName: string): ts.ScriptKind {
  return rootFileName.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
}

export interface TsCompilerHostResult {
  host: ts.CompilerHost;
  getEmittedJs(): string | null;
  getEmittedMap(): string | null;
}

/**
 * Builds a `ts.CompilerHost` with no real filesystem: the root file is
 * served from `sourceText` (parsed fresh, since it changes every call), lib
 * files are served from `tsLibSources.ts` (parsed once, cached), and
 * remote-module declaration files are synthesized from `moduleResolver`'s
 * classification. `writeFile` captures emitted JS/source-map text into
 * closure state instead of touching disk — read back via
 * `getEmittedJs`/`getEmittedMap` after `program.emit()`.
 */
export function createTsCompilerHost(
  rootFileName: string,
  sourceText: string,
  moduleResolver: ModuleResolver,
): TsCompilerHostResult {
  let emittedJs: string | null = null;
  let emittedMap: string | null = null;
  const rootScriptKind = scriptKindForRootFileName(rootFileName);

  const host: ts.CompilerHost = {
    // `languageVersionOrOptions` is forwarded whole, not reduced to its
    // `languageVersion`: the options object also carries the program's
    // `moduleDetection` result (`setExternalModuleIndicator`), without which
    // module-mode sources with no import/export would parse as scripts.
    getSourceFile(fileName, languageVersionOrOptions) {
      if (fileName === rootFileName) {
        return ts.createSourceFile(
          fileName,
          sourceText,
          languageVersionOrOptions,
          true,
          rootScriptKind,
        );
      }
      if (isRemoteModuleFileName(fileName)) {
        return ts.createSourceFile(
          fileName,
          buildRemoteModuleDeclarationText(
            remoteModuleSpecifierFromFileName(fileName),
          ),
          languageVersionOrOptions,
          true,
        );
      }
      return getLibSourceFile(basename(fileName));
    },
    getDefaultLibFileName() {
      return TS_DEFAULT_LIB_FILE_NAME;
    },
    writeFile(fileName, text) {
      if (fileName.endsWith(".js.map")) {
        emittedMap = text;
      } else if (fileName.endsWith(".js")) {
        emittedJs = text;
      }
    },
    getCurrentDirectory() {
      return "/";
    },
    getCanonicalFileName(fileName) {
      return fileName;
    },
    useCaseSensitiveFileNames() {
      return true;
    },
    getNewLine() {
      return "\n";
    },
    fileExists(fileName) {
      return (
        fileName === rootFileName ||
        isRemoteModuleFileName(fileName) ||
        TS_LIB_SOURCES.has(basename(fileName))
      );
    },
    readFile(fileName) {
      if (fileName === rootFileName) return sourceText;
      if (isRemoteModuleFileName(fileName)) {
        return buildRemoteModuleDeclarationText(
          remoteModuleSpecifierFromFileName(fileName),
        );
      }
      return TS_LIB_SOURCES.get(basename(fileName));
    },
    resolveModuleNameLiterals: moduleResolver.resolveModuleNameLiterals,
  };

  return {
    host,
    getEmittedJs: () => emittedJs,
    getEmittedMap: () => emittedMap,
  };
}
