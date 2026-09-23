import { act, renderHook } from "@testing-library/react";
import { useReducer } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ProjectRepository,
  ProjectSnapshot,
} from "../persistence/projectRepository";
import {
  createInitialProjectStoreState,
  projectReducer,
} from "./projectReducer";
import { useAutosave } from "./useAutosave";

interface FakeRepository extends ProjectRepository {
  savedSnapshots: ProjectSnapshot[];
  saveResult: "success" | "failure";
}

function createFakeRepository(): FakeRepository {
  const savedSnapshots: ProjectSnapshot[] = [];
  const repository: FakeRepository = {
    saveResult: "success",
    savedSnapshots,
    load: async () => ({
      snapshot: null,
      recoveredCount: 0,
      rejectedNewerAppVersion: false,
    }),
    saveSnapshot: async (snapshot) => {
      savedSnapshots.push(snapshot);
      if (repository.saveResult === "failure") {
        throw new Error("save failed");
      }
    },
    resetAllData: async () => {},
  };
  return repository;
}

function useHarness(repository: ProjectRepository, hydrationReady: boolean) {
  function useTestHarness({ ready }: { ready: boolean }) {
    const [state, dispatch] = useReducer(
      projectReducer,
      undefined,
      createInitialProjectStoreState,
    );
    const autosave = useAutosave(state, dispatch, repository, ready);
    return { state, dispatch, autosave };
  }
  return renderHook(useTestHarness, {
    initialProps: { ready: hydrationReady },
  });
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not save while hydration is not ready", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository, false);

    act(() => {
      result.current.dispatch({
        type: "project/rename",
        payload: {
          projectId: result.current.state.activeProjectId,
          title: "Renamed",
        },
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(repository.savedSnapshots).toHaveLength(0);
  });

  it("debounces multiple edits into a single save", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository, true);
    const projectId = result.current.state.activeProjectId;

    act(() => {
      result.current.dispatch({
        type: "project/rename",
        payload: { projectId, title: "First" },
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    act(() => {
      result.current.dispatch({
        type: "project/rename",
        payload: { projectId, title: "Second" },
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(repository.savedSnapshots).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(repository.savedSnapshots).toHaveLength(1);
    expect(repository.savedSnapshots[0]?.projects[0]?.title).toBe("Second");
    expect(result.current.autosave.saveStatus).toBe("saved");
  });

  it("transitions to save-failed when the repository rejects", async () => {
    const repository = createFakeRepository();
    repository.saveResult = "failure";
    const { result } = useHarness(repository, true);

    act(() => {
      result.current.dispatch({
        type: "project/rename",
        payload: {
          projectId: result.current.state.activeProjectId,
          title: "Renamed",
        },
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.autosave.saveStatus).toBe("save-failed");
  });

  it("saveNow flushes a pending debounce immediately", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository, true);

    act(() => {
      result.current.dispatch({
        type: "project/rename",
        payload: {
          projectId: result.current.state.activeProjectId,
          title: "Renamed",
        },
      });
    });

    await act(async () => {
      result.current.autosave.saveNow();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(repository.savedSnapshots).toHaveLength(1);
    expect(result.current.autosave.saveStatus).toBe("saved");
  });

  it("saveNow retries a failed save even with no new edit pending", async () => {
    const repository = createFakeRepository();
    repository.saveResult = "failure";
    const { result } = useHarness(repository, true);

    act(() => {
      result.current.dispatch({
        type: "project/rename",
        payload: {
          projectId: result.current.state.activeProjectId,
          title: "Renamed",
        },
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.autosave.saveStatus).toBe("save-failed");

    repository.saveResult = "success";
    await act(async () => {
      result.current.autosave.saveNow();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(repository.savedSnapshots).toHaveLength(2);
    expect(result.current.autosave.saveStatus).toBe("saved");
    expect(result.current.state.lastPersistedRevision).toBe(
      result.current.state.revision,
    );
  });

  it("saveNow does nothing when the store is already saved", async () => {
    const repository = createFakeRepository();
    const { result } = useHarness(repository, true);

    await act(async () => {
      result.current.autosave.saveNow();
      await Promise.resolve();
    });

    expect(repository.savedSnapshots).toHaveLength(0);
  });
});
