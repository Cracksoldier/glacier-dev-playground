import type { ProjectRepository } from "../persistence/projectRepository";

/**
 * A `ProjectRepository` double that reports nothing persisted and no-ops on
 * writes. Used by component tests that render `ProjectStoreProvider` and
 * need hydration to resolve deterministically — the default IndexedDB-backed
 * repository races its async hydration against a shared, cross-test
 * database, which can dispatch `project/hydrate` (and change
 * `activeProject.id`) mid-test.
 */
export function createInMemoryProjectRepository(): ProjectRepository {
  return {
    load: () =>
      Promise.resolve({
        snapshot: null,
        recoveredCount: 0,
        rejectedNewerAppVersion: false,
      }),
    saveSnapshot: () => Promise.resolve(),
    resetAllData: () => Promise.resolve(),
  };
}
