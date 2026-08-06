import { useEffect } from "react";
import type { SaveStatus } from "../models/saveStatus";

/**
 * Warns on navigation only while there's a pending or most-recently-failed
 * save. Deliberately excludes `storage-unavailable` — there's no save
 * operation in flight there, and the toolbar's persistent notice already
 * covers that case without a nag on every navigation.
 */
export function useBeforeUnloadWarning(saveStatus: SaveStatus): void {
  useEffect(() => {
    if (saveStatus !== "saving" && saveStatus !== "save-failed") return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveStatus]);
}
