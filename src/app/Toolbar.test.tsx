import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../store/ProjectStoreContext";
import Toolbar from "./Toolbar";

function RenameOnMount() {
  const { activeProject, actions } = useProjectStore();
  const { id: activeProjectId } = activeProject;
  const { renameProject } = actions;
  useEffect(() => {
    renameProject(activeProjectId, "Renamed Project");
  }, [activeProjectId, renameProject]);
  return null;
}

describe("Toolbar", () => {
  it("renders the active project's title from the store", () => {
    render(
      <ProjectStoreProvider>
        <Toolbar />
      </ProjectStoreProvider>,
    );

    expect(screen.getByText("Basic HTML Example")).toBeInTheDocument();
  });

  it("reflects store updates to the active project's title", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider>
          <RenameOnMount />
          <Toolbar />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.getByText("Renamed Project")).toBeInTheDocument();
  });
});
