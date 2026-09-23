import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EDITOR_PREFERENCES } from "../preferences/editorPreferences";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../store/ProjectStoreContext";
import Toolbar from "./Toolbar";

function renderToolbar(onRun = vi.fn()) {
  return render(
    <ProjectStoreProvider>
      <Toolbar
        editorPreferences={DEFAULT_EDITOR_PREFERENCES}
        onUpdateEditorPreferences={vi.fn()}
        onRun={onRun}
      />
    </ProjectStoreProvider>,
  );
}

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
    renderToolbar();

    expect(screen.getByText("Basic HTML Example")).toBeInTheDocument();
  });

  it("reflects store updates to the active project's title", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider>
          <RenameOnMount />
          <Toolbar
            editorPreferences={DEFAULT_EDITOR_PREFERENCES}
            onUpdateEditorPreferences={vi.fn()}
            onRun={vi.fn()}
          />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.getByText("Renamed Project")).toBeInTheDocument();
  });

  it("shows the current save status", () => {
    renderToolbar();

    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("opens the project switcher popover from the toolbar button", async () => {
    const user = userEvent.setup();
    renderToolbar();

    const trigger = screen.getByRole("button", { name: "Switch project" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    expect(screen.getByRole("group", { name: "Projects" })).toBeInTheDocument();
    // Disclosure pattern: no aria-haspopup, since the popover is not a menu.
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).not.toHaveAttribute("aria-haspopup");
  });

  it("opens the new project dialog from the toolbar button", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "New project" }));

    expect(
      screen.getByRole("dialog", { name: "New project" }),
    ).toBeInTheDocument();
  });

  it("opens the reset dialog from the toolbar button", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.getByRole("dialog", { name: "Reset project" }),
    ).toBeInTheDocument();
  });

  it("opens the editor preferences popover from the toolbar button", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(
      screen.getByRole("button", { name: "Editor preferences" }),
    );

    expect(
      screen.getByRole("group", { name: "Editor preferences" }),
    ).toBeInTheDocument();
  });

  it("fires onRun when the Run button is clicked", async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    renderToolbar(onRun);

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(onRun).toHaveBeenCalledOnce();
  });

  it("toggles auto-run and reflects the pressed state", async () => {
    const user = userEvent.setup();
    renderToolbar();

    const autoRunButton = screen.getByRole("button", { name: "Auto-run" });
    const initiallyPressed = autoRunButton.getAttribute("aria-pressed");

    await user.click(autoRunButton);

    expect(autoRunButton.getAttribute("aria-pressed")).not.toBe(
      initiallyPressed,
    );
  });
});
