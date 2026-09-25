import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type {
  LoadResult,
  ProjectRepository,
  ProjectSnapshot,
} from "../persistence/projectRepository";
import { ProjectStoreProvider, useProjectStore } from "./ProjectStoreContext";

function createMemoryRepository(loadResult: LoadResult): {
  repository: ProjectRepository;
  saved: ProjectSnapshot[];
} {
  const saved: ProjectSnapshot[] = [];
  return {
    saved,
    repository: {
      load: async () => loadResult,
      saveSnapshot: async (snapshot) => {
        saved.push(snapshot);
      },
      resetAllData: async () => {},
    },
  };
}

const FIRST_RUN: LoadResult = {
  snapshot: null,
  recoveredCount: 0,
  rejectedNewerAppVersion: false,
};

function renderStore(repository: ProjectRepository) {
  return renderHook(() => useProjectStore(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ProjectStoreProvider repository={repository}>
        {children}
      </ProjectStoreProvider>
    ),
  });
}

describe("useProjectStore", () => {
  it("throws when used outside a ProjectStoreProvider", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useProjectStore())).toThrow(
      "useProjectStore must be used within a ProjectStoreProvider.",
    );

    consoleErrorSpy.mockRestore();
  });

  it("exposes the seeded starter project when used within a provider", () => {
    const { result } = renderHook(() => useProjectStore(), {
      wrapper: ProjectStoreProvider,
    });

    expect(result.current.projects).toHaveLength(1);
    expect(result.current.activeProject).toBe(result.current.projects[0]);
    expect(result.current.isDirty).toBe(false);
  });

  it("reaches the reducer through dispatched actions", () => {
    const { result } = renderHook(() => useProjectStore(), {
      wrapper: ProjectStoreProvider,
    });
    const projectId = result.current.activeProject.id;

    act(() => {
      result.current.actions.renameProject(projectId, "Renamed via store");
    });

    expect(result.current.activeProject.title).toBe("Renamed via store");
    expect(result.current.isDirty).toBe(true);
  });
});

describe("ProjectStoreProvider persistence", () => {
  it("reports saving while an edit's debounced save is pending, then saved", async () => {
    const { repository, saved } = createMemoryRepository(FIRST_RUN);
    const { result } = renderStore(repository);
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(result.current.saveStatus).toBe("saved");

    act(() => {
      result.current.actions.renameProject(
        result.current.activeProject.id,
        "Pending edit",
      );
    });

    expect(result.current.saveStatus).toBe("saving");
    await waitFor(() => expect(result.current.saveStatus).toBe("saved"), {
      timeout: 3000,
    });
    expect(saved.at(-1)?.projects[0]?.title).toBe("Pending edit");
  });

  it("persists a project switch so the last active project reopens", async () => {
    const { repository, saved } = createMemoryRepository(FIRST_RUN);
    const { result } = renderStore(repository);
    await waitFor(() => expect(saved).toHaveLength(1));
    const firstProjectId = result.current.activeProject.id;

    act(() => {
      result.current.actions.createProject("empty", "Second");
    });
    await waitFor(() => expect(result.current.isDirty).toBe(false), {
      timeout: 3000,
    });

    act(() => {
      result.current.actions.switchProject(firstProjectId);
    });
    await waitFor(() => expect(result.current.isDirty).toBe(false), {
      timeout: 3000,
    });

    expect(saved.at(-1)?.activeProjectId).toBe(firstProjectId);
  });

  it("never saves while unloadable persisted data blocks saving", async () => {
    const { repository, saved } = createMemoryRepository({
      snapshot: null,
      recoveredCount: 0,
      rejectedNewerAppVersion: true,
    });
    const { result } = renderStore(repository);
    await waitFor(() => expect(result.current.isSavingBlocked).toBe(true));
    expect(result.current.saveStatus).toBe("storage-unavailable");

    act(() => {
      result.current.actions.renameProject(
        result.current.activeProject.id,
        "Must not overwrite newer data",
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    expect(saved).toHaveLength(0);
  });
});

function ActiveTitleProbe() {
  const { activeProject } = useProjectStore();
  return <p>{activeProject.title}</p>;
}

describe("ProjectStoreProvider", () => {
  it("renders children with access to the store", () => {
    render(
      <ProjectStoreProvider>
        <ActiveTitleProbe />
      </ProjectStoreProvider>,
    );

    expect(screen.getByText("Basic HTML Example")).toBeInTheDocument();
  });
});
