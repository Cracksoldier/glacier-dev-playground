import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

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

  it("shows the current save status", () => {
    render(
      <ProjectStoreProvider>
        <Toolbar />
      </ProjectStoreProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("opens the project switcher popover from the toolbar button", async () => {
    const user = userEvent.setup();
    render(
      <ProjectStoreProvider>
        <Toolbar />
      </ProjectStoreProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Switch project" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("opens the new project dialog from the toolbar button", async () => {
    const user = userEvent.setup();
    render(
      <ProjectStoreProvider>
        <Toolbar />
      </ProjectStoreProvider>,
    );

    await user.click(screen.getByRole("button", { name: "New project" }));

    expect(
      screen.getByRole("dialog", { name: "New project" }),
    ).toBeInTheDocument();
  });

  it("opens the reset dialog from the toolbar button", async () => {
    const user = userEvent.setup();
    render(
      <ProjectStoreProvider>
        <Toolbar />
      </ProjectStoreProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.getByRole("dialog", { name: "Reset project" }),
    ).toBeInTheDocument();
  });
});
