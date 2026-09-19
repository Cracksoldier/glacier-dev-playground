import type { Diagnostic } from "@codemirror/lint";
import type { Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/**
 * Re-exported so compiler-worker milestones (M7 SCSS, M8 TypeScript) can
 * depend on this module for the diagnostic shape without importing
 * `@codemirror/lint` directly.
 */
export type { Diagnostic };

/** Moves the caret to `position` and scrolls it into view, then focuses the editor. */
export function focusSourcePosition(view: EditorView, position: number): void {
  const clamped = Math.max(0, Math.min(position, view.state.doc.length));
  view.dispatch({
    selection: { anchor: clamped },
    scrollIntoView: true,
  });
  view.focus();
}

/**
 * Clamps a 1-indexed `line`/`column` into the document's actual bounds so an
 * out-of-range report (e.g. a stale error against now-shorter source) still
 * resolves to the nearest valid position instead of throwing, and returns
 * the resulting `[from, to)` span (start of the clamped column through the
 * end of its line). Shared by both diagnostic builders below.
 */
function clampErrorPosition(
  doc: Text,
  line?: number,
  column?: number,
): { from: number; to: number } {
  const lineNumber = Math.max(1, Math.min(line ?? 1, doc.lines));
  const docLine = doc.line(lineNumber);
  const clampedColumn = Math.max(
    0,
    Math.min((column ?? 1) - 1, docLine.length),
  );
  return { from: docLine.from + clampedColumn, to: docLine.to };
}

/**
 * Converts a compiler error (1-indexed `line`/`column`, e.g. from
 * `ScssCompileError`) into a CodeMirror `Diagnostic` positioned at that
 * line. Diagnostics without a `line` fall back to the document start.
 */
export function buildDiagnosticFromError(
  doc: Text,
  error: { message: string; line?: number; column?: number },
): Diagnostic {
  const { from, to } = clampErrorPosition(doc, error.line, error.column);
  return { from, to, severity: "error", message: error.message };
}

/**
 * Plural counterpart to `buildDiagnosticFromError`, for compilers (e.g. the
 * M8 TypeScript/JavaScript worker) that can report many diagnostics per
 * file. Each error's own `severity` is honored (defaulting to `"error"`)
 * instead of always being an error.
 */
export function buildDiagnosticsFromErrors(
  doc: Text,
  errors: {
    message: string;
    line?: number;
    column?: number;
    severity?: "error" | "warning";
  }[],
): Diagnostic[] {
  return errors.map((error) => {
    const { from, to } = clampErrorPosition(doc, error.line, error.column);
    return {
      from,
      to,
      severity: error.severity ?? "error",
      message: error.message,
    };
  });
}
