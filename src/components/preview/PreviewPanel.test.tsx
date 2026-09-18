import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import PreviewPanel from "./PreviewPanel";

function createConsoleEntriesStub(): UseConsoleEntriesResult {
  return {
    entries: [],
    startRun: vi.fn(),
    clear: vi.fn(),
    append: vi.fn(),
  };
}

function renderPreviewPanel() {
  return render(
    <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
      <PreviewPanel consoleEntries={createConsoleEntriesStub()} />
    </ProjectStoreProvider>,
  );
}

function AddRelativeImageOnMount() {
  const { activeProject, actions } = useProjectStore();
  const { id: activeProjectId } = activeProject;
  const { updateProjectSource } = actions;
  useEffect(() => {
    updateProjectSource(activeProjectId, {
      html: '<img src="images/a.png">',
    });
  }, [activeProjectId, updateProjectSource]);
  return null;
}

describe("PreviewPanel", () => {
  it("renders the Preview section with a header", () => {
    renderPreviewPanel();
    expect(screen.getByRole("region", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("does not show the relative-URL warning for the default starter project", () => {
    renderPreviewPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the relative-URL warning once the source contains a relative asset URL", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
          <AddRelativeImageOnMount />
          <PreviewPanel consoleEntries={createConsoleEntriesStub()} />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Relative asset URLs aren't portable",
    );
  });

  it("renders a preview iframe", () => {
    const { container } = renderPreviewPanel();
    expect(container.querySelector("iframe")).toBeInTheDocument();
  });
});
