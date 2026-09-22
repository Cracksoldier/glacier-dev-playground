import type { RefObject } from "react";
import { useEffect } from "react";
import type { CodeMirrorEditorHandle } from "../components/editors/CodeMirrorEditor";
import type { ActiveTab } from "../preferences/layoutPreferences";

export interface FocusableHandle {
  focus: () => void;
}

export interface NarrowTabOptions {
  isNarrow: boolean;
  setActiveTab: (tab: ActiveTab) => void;
}

const TAB_FOR_KEY: Record<string, ActiveTab> = {
  "1": "html",
  "2": "css",
  "3": "js",
  "4": "preview",
};

/**
 * Binds Alt+1/2/3/4 to focus the HTML/CSS/JS editor panels and the preview
 * panel respectively, preventing any native browser handling of the combo.
 *
 * On narrow layouts the target panel may be hidden behind another tab, where
 * `focus()` is a no-op — so the tab is selected first and the focus call
 * deferred to the next frame, once the panel is actually rendered.
 */
export function useEditorFocusShortcuts(
  htmlEditorRef: RefObject<CodeMirrorEditorHandle | null>,
  cssEditorRef: RefObject<CodeMirrorEditorHandle | null>,
  jsEditorRef: RefObject<CodeMirrorEditorHandle | null>,
  previewRef: RefObject<FocusableHandle | null>,
  narrowTabs?: NarrowTabOptions,
): void {
  const isNarrow = narrowTabs?.isNarrow ?? false;
  const setActiveTab = narrowTabs?.setActiveTab;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isFocusCombo =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        ["1", "2", "3", "4"].includes(event.key);
      if (!isFocusCombo) return;

      const targetRef =
        event.key === "1"
          ? htmlEditorRef
          : event.key === "2"
            ? cssEditorRef
            : event.key === "3"
              ? jsEditorRef
              : previewRef;
      if (!targetRef.current) return;

      event.preventDefault();

      if (isNarrow && setActiveTab) {
        setActiveTab(TAB_FOR_KEY[event.key]);
        window.requestAnimationFrame(() => targetRef.current?.focus());
        return;
      }

      targetRef.current.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    htmlEditorRef,
    cssEditorRef,
    jsEditorRef,
    previewRef,
    isNarrow,
    setActiveTab,
  ]);
}
