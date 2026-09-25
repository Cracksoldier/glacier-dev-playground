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

/**
 * Keyed by `KeyboardEvent.code` (the physical key), not `.key` (the produced
 * character): with Alt held, macOS Option produces "¡", "™", … and layouts
 * like AZERTY need Shift for digits, so `.key` is never "1"–"4" there.
 */
const TAB_FOR_CODE: Partial<Record<string, ActiveTab>> = {
  Digit1: "html",
  Digit2: "css",
  Digit3: "js",
  Digit4: "preview",
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
      const tab = TAB_FOR_CODE[event.code];
      const isFocusCombo =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        tab !== undefined;
      if (!isFocusCombo) return;

      const targetRef =
        tab === "html"
          ? htmlEditorRef
          : tab === "css"
            ? cssEditorRef
            : tab === "js"
              ? jsEditorRef
              : previewRef;
      if (!targetRef.current) return;

      event.preventDefault();

      if (isNarrow && setActiveTab) {
        setActiveTab(tab);
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
