import { type Dispatch, useCallback, useEffect, useRef, useState } from "react";
import type { ProjectRepository } from "../persistence/projectRepository";
import type { ProjectStoreAction, ProjectStoreState } from "./projectReducer";

/**
 * `blocked` means persisted data exists but can't be loaded (written by a
 * newer app version, or every record unreadable). Saving stays disabled so
 * that data is never overwritten until the user explicitly resets it.
 */
export type HydrationStatus = "loading" | "ready" | "blocked" | "unavailable";

export interface PersistenceNotice {
  /** Number of persisted records skipped this load (invalid shape or unsupported future version). */
  recoveredCount: number;
  /** True if the persisted data was written by a newer, incompatible app version. */
  rejectedNewerAppVersion: boolean;
}

export interface UseProjectHydrationResult {
  status: HydrationStatus;
  notice: PersistenceNotice | null;
  resetLocalData: () => Promise<void>;
  dismissNotice: () => void;
}

/**
 * Loads persisted projects once on mount and hydrates the reducer with them.
 * If the in-memory fallback state has already been edited by the time the
 * load resolves (the user started editing during the async gap), the reducer
 * merges the persisted projects with the edited ones rather than dropping
 * either side — see `project/loadPersisted`.
 */
export function useProjectHydration(
  state: ProjectStoreState,
  dispatch: Dispatch<ProjectStoreAction>,
  repository: ProjectRepository,
): UseProjectHydrationResult {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const [status, setStatus] = useState<HydrationStatus>("loading");
  const [notice, setNotice] = useState<PersistenceNotice | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const result = await repository.load();
        if (cancelled) return;

        if (result.recoveredCount > 0 || result.rejectedNewerAppVersion) {
          setNotice({
            recoveredCount: result.recoveredCount,
            rejectedNewerAppVersion: result.rejectedNewerAppVersion,
          });
        }

        if (result.snapshot === null) {
          if (result.rejectedNewerAppVersion || result.recoveredCount > 0) {
            setStatus("blocked");
            return;
          }
          setStatus("ready");
          void repository.saveSnapshot({
            projects: stateRef.current.projects,
            activeProjectId: stateRef.current.activeProjectId,
          });
          return;
        }

        dispatch({ type: "project/loadPersisted", payload: result.snapshot });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [repository, dispatch]);

  const resetLocalData = useCallback(async () => {
    await repository.resetAllData();
    dispatch({
      type: "project/hydrate",
      payload: { projects: [], activeProjectId: "" },
    });
    setNotice(null);
    setStatus((current) => (current === "blocked" ? "ready" : current));
  }, [repository, dispatch]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return { status, notice, resetLocalData, dismissNotice };
}
