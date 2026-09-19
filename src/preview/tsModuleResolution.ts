import type * as ts from "typescript";

/**
 * The prefix synthetic remote-module declaration files are given, so
 * `tsCompilerHost.ts#getSourceFile` can recognize and serve them without
 * needing a separate side-channel — the resolver and the host agree on this
 * naming scheme instead.
 */
const REMOTE_MODULE_FILE_PREFIX = "glacier-remote-module:";

/**
 * Classifies a raw import/export specifier for M8's absolute-HTTPS-imports
 * policy (see the M8 plan's design decision #5): an absolute `https://` URL
 * is allowed through (typed as `any` via a synthetic ambient declaration);
 * anything else — bare specifiers (`"lodash"`), relative paths (`"./foo"`),
 * and even absolute `http://` URLs — is rejected, letting TypeScript's own
 * `TS2307` ("Cannot find module") fire as the blocking diagnostic with no
 * custom message needed.
 */
export function classifyModuleSpecifier(
  specifier: string,
): "absolute-https" | "rejected" {
  try {
    const url = new URL(specifier);
    return url.protocol === "https:" ? "absolute-https" : "rejected";
  } catch {
    return "rejected";
  }
}

/** The synthetic file name a given remote specifier's ambient declaration is served under. */
export function remoteModuleFileName(specifier: string): string {
  return `${REMOTE_MODULE_FILE_PREFIX}${encodeURIComponent(specifier)}//index.d.ts`;
}

/** Whether `fileName` is one of this resolver's synthetic remote-module declaration files. */
export function isRemoteModuleFileName(fileName: string): boolean {
  return fileName.startsWith(REMOTE_MODULE_FILE_PREFIX);
}

/** Recovers the original specifier from a synthetic file name built by `remoteModuleFileName`. */
export function remoteModuleSpecifierFromFileName(fileName: string): string {
  const withoutPrefix = fileName.slice(REMOTE_MODULE_FILE_PREFIX.length);
  const withoutSuffix = withoutPrefix.slice(0, -"//index.d.ts".length);
  return decodeURIComponent(withoutSuffix);
}

/**
 * The ambient module declaration text served for a resolved remote import —
 * the one documented, isolated `any` in this subsystem (an interop
 * boundary for untyped remote code, never hand-written app code).
 */
export function buildRemoteModuleDeclarationText(specifier: string): string {
  return `declare module "${specifier}" {\n  const glacierRemoteModule: any;\n  export = glacierRemoteModule;\n}\n`;
}

export interface ModuleResolver {
  resolveModuleNameLiterals: NonNullable<
    ts.CompilerHost["resolveModuleNameLiterals"]
  >;
  /** Every distinct specifier classified `"absolute-https"` across all `resolveModuleNameLiterals` calls so far, in first-seen order. */
  resolvedRemoteSpecifiers(): string[];
}

/**
 * Builds the `CompilerHost#resolveModuleNameLiterals` hook (the current,
 * non-deprecated resolution API — this repo's installed `typescript` marks
 * the older `resolveModuleNames` deprecated) implementing the classification
 * above. Absolute-HTTPS specifiers resolve to this resolver's synthetic
 * `remoteModuleFileName` declaration file; everything else resolves to
 * `undefined`, which is TypeScript's own signal for "could not resolve" and
 * produces `TS2307` without any custom diagnostic code.
 */
export function createModuleResolver(): ModuleResolver {
  const seen = new Set<string>();
  const order: string[] = [];

  return {
    resolveModuleNameLiterals(moduleLiterals) {
      return moduleLiterals.map((literal) => {
        const specifier = literal.text;
        if (classifyModuleSpecifier(specifier) !== "absolute-https") {
          return { resolvedModule: undefined };
        }
        if (!seen.has(specifier)) {
          seen.add(specifier);
          order.push(specifier);
        }
        return {
          resolvedModule: {
            resolvedFileName: remoteModuleFileName(specifier),
            extension: ".d.ts",
            isExternalLibraryImport: false,
          },
        };
      });
    },
    resolvedRemoteSpecifiers() {
      return [...order];
    },
  };
}
