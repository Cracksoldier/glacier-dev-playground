import { useEffect } from "react";

/**
 * Binds Ctrl/Cmd+S to `saveNow`, preventing the browser's native
 * save-page action from firing.
 */
export function useSaveShortcut(saveNow: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSaveCombo =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "s";
      if (!isSaveCombo) return;

      event.preventDefault();
      saveNow();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [saveNow]);
}
