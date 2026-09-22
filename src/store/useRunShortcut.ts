import { useEffect } from "react";

/**
 * Binds Ctrl/Cmd+Enter to `run`, preventing any native browser handling of
 * the combo.
 */
export function useRunShortcut(run: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isRunCombo =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key === "Enter";
      if (!isRunCombo) return;

      event.preventDefault();
      run();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [run]);
}
