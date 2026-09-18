import type { ScssCompileError } from "./scssWorkerProtocol";

export type ScssCompileResult =
  | { type: "success"; css: string }
  | { type: "failure"; error: ScssCompileError };

/**
 * Converts a thrown Sass compile failure into our own structured error
 * shape. Dart Sass's `Exception#span` locations are 0-indexed; converted to
 * 1-indexed here to match `CodeMirrorEditorHandle.focusLine`'s convention
 * and the rest of this app's editor-line numbering.
 */
export function toScssCompileError(rawError: unknown): ScssCompileError {
  if (
    rawError !== null &&
    typeof rawError === "object" &&
    "sassMessage" in rawError &&
    typeof rawError.sassMessage === "string"
  ) {
    const span =
      "span" in rawError &&
      rawError.span !== null &&
      typeof rawError.span === "object"
        ? (rawError.span as {
            start?: { line?: number; column?: number };
            text?: string;
          })
        : undefined;
    return {
      message: rawError.sassMessage,
      line:
        typeof span?.start?.line === "number" ? span.start.line + 1 : undefined,
      column:
        typeof span?.start?.column === "number"
          ? span.start.column + 1
          : undefined,
      sourceExcerpt:
        typeof span?.text === "string" && span.text.length > 0
          ? span.text
          : undefined,
    };
  }
  if (rawError instanceof Error) {
    return { message: rawError.message };
  }
  return { message: "SCSS compilation failed." };
}

/**
 * Compiles a single SCSS source string to CSS via Dart Sass. Deliberately a
 * plain importable function (not tied to `self.onmessage`/Worker glue) so
 * it's directly unit-testable with real compiles under Node/Vitest — see
 * `scssCompiler.worker.ts` for the thin Worker wrapper around this.
 *
 * No `importer`/`loadPaths` options are passed: this app only supports
 * single-file compilation, so any `@use`/`@import` of another file fails
 * naturally with a Sass compile error, with no special-casing needed.
 */
export async function compileScss(source: string): Promise<ScssCompileResult> {
  const sass = await import("sass");
  try {
    const result = await sass.compileStringAsync(source, {
      style: "expanded",
    });
    return { type: "success", css: result.css };
  } catch (rawError) {
    return { type: "failure", error: toScssCompileError(rawError) };
  }
}
