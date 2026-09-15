import type { Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";

/**
 * Re-exported so later milestones (M7/M8 compiler workers) can depend on
 * this module for the diagnostic shape without importing `@codemirror/lint`
 * directly. Each `CodeMirrorEditor` reserves an empty `Compartment` that a
 * later milestone can reconfigure with a `linter(...)` extension or manual
 * `setDiagnostics(view, diagnostics)` calls built from this type — no
 * diagnostics producer exists yet, so nothing is wired up behaviorally here.
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
