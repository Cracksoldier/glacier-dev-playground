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
 * Converts a compiler error (1-indexed `line`/`column`, e.g. from
 * `ScssCompileError`) into a CodeMirror `Diagnostic` positioned at that
 * line. `line`/`column` are clamped into the document's actual bounds so an
 * out-of-range report (e.g. a stale error against now-shorter source) still
 * renders at the nearest valid position instead of throwing. Diagnostics
 * without a `line` fall back to the document start.
 */
export function buildDiagnosticFromError(
  doc: Text,
  error: { message: string; line?: number; column?: number },
): Diagnostic {
  const lineNumber = Math.max(1, Math.min(error.line ?? 1, doc.lines));
  const docLine = doc.line(lineNumber);
  const column = Math.max(0, Math.min((error.column ?? 1) - 1, docLine.length));
  const from = docLine.from + column;
  return {
    from,
    to: docLine.to,
    severity: "error",
    message: error.message,
  };
}
