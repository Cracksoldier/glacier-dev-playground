import { type Dispatch, useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "../models/saveStatus";
import { createDebouncer } from "../persistence/debounce";
import type { ProjectRepository } from "../persistence/projectRepository";
import type { ProjectStoreAction, ProjectStoreState } from "./projectReducer";

const AUTOSAVE_DEBOUNCE_MS = 800;

export interface UseAutosaveResult {
  saveStatus: SaveStatus;
  saveNow: () => void;
}

/**
 * Debounces persistence of `state` whenever it's dirty relative to the last
 * successful save. `saveNow` (the Ctrl/Cmd+S shortcut) flushes a pending
 * debounce immediately, or — when nothing is pending but the store is still
 * dirty, e.g. after a failed save — starts a new save attempt.
 */
export function useAutosave(
  state: ProjectStoreState,
  dispatch: Dispatch<ProjectStoreAction>,
  repository: ProjectRepository,
  hydrationReady: boolean,
): UseAutosaveResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const stateRef = useRef(state);
  const hydrationReadyRef = useRef(hydrationReady);
  useEffect(() => {
    stateRef.current = state;
    hydrationReadyRef.current = hydrationReady;
  });

  const debouncerRef = useRef<ReturnType<typeof createDebouncer<void>>>(null);
  if (debouncerRef.current === null) {
    debouncerRef.current = createDebouncer(AUTOSAVE_DEBOUNCE_MS, () => {
      void performSave();
    });
  }

  async function performSave() {
    const revisionAtSaveStart = stateRef.current.revision;
    setSaveStatus("saving");
    try {
      await repository.saveSnapshot({
        projects: stateRef.current.projects,
        activeProjectId: stateRef.current.activeProjectId,
      });
      dispatch({
        type: "project/markSaved",
        payload: { revision: revisionAtSaveStart },
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("save-failed");
    }
  }

  useEffect(() => {
    if (!hydrationReady) return;
    if (state.revision === state.lastPersistedRevision) return;

    const debouncer = debouncerRef.current;
    if (debouncer === null) return;
    debouncer.schedule();
  }, [state.revision, state.lastPersistedRevision, hydrationReady]);

  useEffect(() => {
    const debouncer = debouncerRef.current;
    return () => {
      debouncer?.cancel();
    };
  }, []);

  const saveNow = useCallback(() => {
    const debouncer = debouncerRef.current;
    if (debouncer === null) return;
    const current = stateRef.current;
    // With nothing pending but the store still dirty (e.g. after a failed
    // save), schedule-then-flush starts a fresh attempt immediately.
    if (
      !debouncer.isPending() &&
      hydrationReadyRef.current &&
      current.revision !== current.lastPersistedRevision
    ) {
      debouncer.schedule();
    }
    debouncer.flush();
  }, []);

  return { saveStatus, saveNow };
}
