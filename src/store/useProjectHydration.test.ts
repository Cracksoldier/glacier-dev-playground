import { act, renderHook, waitFor } from "@testing-library/react";
import { useReducer } from "react";
import { describe, expect, it } from "vitest";
import type { PlaygroundProject } from "../models/project";
import { PROJECT_TEMPLATES } from "../models/templates";
import type {
  LoadResult,
  ProjectRepository,
  ProjectSnapshot,
} from "../persistence/projectRepository";
import { StorageUnavailableError } from "../persistence/projectRepository";
import {
  createInitialProjectStoreState,
  projectReducer,
} from "./projectReducer";
import { useProjectHydration } from "./useProjectHydration";

function makeProject(title: string): PlaygroundProject {
  return { ...PROJECT_TEMPLATES.empty.create(), title };
}

interface FakeRepository extends ProjectRepository {
  resolveLoad: (result: LoadResult) => void;
  rejectLoad: (error: unknown) => void;
  savedSnapshots: ProjectSnapshot[];
}

function createFakeRepository(): FakeRepository {
  let resolveFn: ((result: LoadResult) => void) | undefined;
  let rejectFn: ((error: unknown) => void) | undefined;
  const savedSnapshots: ProjectSnapshot[] = [];

  const loadPromise = new Promise<LoadResult>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    load: () => loadPromise,
    saveSnapshot: async (snapshot) => {
      savedSnapshots.push(snapshot);
    },
    resetAllData: async () => {},
    resolveLoad: (result) => resolveFn?.(result),
    rejectLoad: (error) => rejectFn?.(error),
    savedSnapshots,
  };
}

function useHarness(repository: ProjectRepository) {
  function useTestHarness() {
    const [state, dispatch] = useReducer(
      projectReducer,
      undefined,
      createInitialProjectStoreState,
    );
    const hydration = useProjectHydration(state, dispatch, repository);
    return { state, dispatch, hydration };
  }
  return renderHook(useTestHarness);
}

describe("useProjectHydration", () => {
  it("persists the in-memory fallback on first run (no snapshot)", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    expect(result.current.hydration.status).toBe("loading");

    await act(async () => {
      repository.resolveLoad({
        snapshot: null,
        recoveredCount: 0,
        rejectedNewerAppVersion: false,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.status).toBe("ready");
    });
    expect(repository.savedSnapshots).toHaveLength(1);
    expect(repository.savedSnapshots[0]?.projects).toEqual(
      result.current.state.projects,
    );
    expect(result.current.hydration.notice).toBeNull();
  });

  it("hydrates the reducer with a persisted snapshot", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    const persistedProject = makeProject("Persisted Project");

    await act(async () => {
      repository.resolveLoad({
        snapshot: {
          projects: [persistedProject],
          activeProjectId: persistedProject.id,
        },
        recoveredCount: 0,
        rejectedNewerAppVersion: false,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.status).toBe("ready");
    });
    expect(result.current.state.projects).toEqual([persistedProject]);
    expect(result.current.state.activeProjectId).toBe(persistedProject.id);
    expect(result.current.hydration.notice).toBeNull();
  });

  it("surfaces a notice and hydrates the valid subset when some entries were corrupt", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    const persistedProject = makeProject("Still Valid");

    await act(async () => {
      repository.resolveLoad({
        snapshot: {
          projects: [persistedProject],
          activeProjectId: persistedProject.id,
        },
        recoveredCount: 2,
        rejectedNewerAppVersion: false,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.status).toBe("ready");
    });
    expect(result.current.state.projects).toEqual([persistedProject]);
    expect(result.current.hydration.notice).toEqual({
      recoveredCount: 2,
      rejectedNewerAppVersion: false,
    });
  });

  it("surfaces a notice without hydrating when the data is from a newer app version", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    const initialProjects = result.current.state.projects;

    await act(async () => {
      repository.resolveLoad({
        snapshot: null,
        recoveredCount: 0,
        rejectedNewerAppVersion: true,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.status).toBe("ready");
    });
    expect(result.current.state.projects).toEqual(initialProjects);
    expect(result.current.hydration.notice).toEqual({
      recoveredCount: 0,
      rejectedNewerAppVersion: true,
    });
  });

  it("sets status to unavailable and does not dispatch when load fails", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    const initialProjects = result.current.state.projects;

    await act(async () => {
      repository.rejectLoad(new StorageUnavailableError());
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.status).toBe("unavailable");
    });
    expect(result.current.state.projects).toEqual(initialProjects);
    expect(result.current.hydration.notice).toBeNull();
  });

  it("skips hydration if the in-memory state already diverged before load resolved", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    act(() => {
      result.current.dispatch({
        type: "project/rename",
        payload: {
          projectId: result.current.state.activeProjectId,
          title: "Edited during load",
        },
      });
    });

    const editedProjects = result.current.state.projects;
    const persistedProject = makeProject("Should Not Overwrite");

    await act(async () => {
      repository.resolveLoad({
        snapshot: {
          projects: [persistedProject],
          activeProjectId: persistedProject.id,
        },
        recoveredCount: 0,
        rejectedNewerAppVersion: false,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.status).toBe("ready");
    });
    expect(result.current.state.projects).toEqual(editedProjects);
  });

  it("resetLocalData wipes persisted data and resets to a fresh starter project", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    await act(async () => {
      repository.resolveLoad({
        snapshot: null,
        recoveredCount: 3,
        rejectedNewerAppVersion: false,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.notice).not.toBeNull();
    });

    await act(async () => {
      await result.current.hydration.resetLocalData();
    });

    expect(result.current.state.projects).toHaveLength(1);
    expect(result.current.hydration.notice).toBeNull();
  });

  it("dismissNotice clears the notice without touching state", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository);

    await act(async () => {
      repository.resolveLoad({
        snapshot: null,
        recoveredCount: 1,
        rejectedNewerAppVersion: false,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.hydration.notice).not.toBeNull();
    });

    act(() => {
      result.current.hydration.dismissNotice();
    });

    expect(result.current.hydration.notice).toBeNull();
  });
});
