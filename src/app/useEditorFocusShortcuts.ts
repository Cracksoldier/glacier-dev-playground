import type { RefObject } from "react";
import { useEffect } from "react";
import type { CodeMirrorEditorHandle } from "../components/editors/CodeMirrorEditor";

/**
 * Binds Alt+1/2/3 to focus the HTML/CSS/JS editor panels respectively,
 * preventing any native browser handling of the combo.
 */
export function useEditorFocusShortcuts(
  htmlEditorRef: RefObject<CodeMirrorEditorHandle | null>,
  cssEditorRef: RefObject<CodeMirrorEditorHandle | null>,
  jsEditorRef: RefObject<CodeMirrorEditorHandle | null>,
): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isFocusCombo =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        ["1", "2", "3"].includes(event.key);
      if (!isFocusCombo) return;

      const targetRef =
        event.key === "1"
          ? htmlEditorRef
          : event.key === "2"
            ? cssEditorRef
            : jsEditorRef;
      if (!targetRef.current) return;

      event.preventDefault();
      targetRef.current.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [htmlEditorRef, cssEditorRef, jsEditorRef]);
}
