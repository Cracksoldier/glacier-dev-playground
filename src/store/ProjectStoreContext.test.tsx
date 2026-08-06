import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectStoreProvider, useProjectStore } from "./ProjectStoreContext";

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
