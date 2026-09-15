import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_PREFERENCES } from "../../preferences/editorPreferences";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import CssEditorPanel from "./CssEditorPanel";

function Harness() {
  const { activeProject, actions } = useProjectStore();
  const firstProjectId = useRef(activeProject.id).current;

  return (
    <div>
      <p data-testid="css-source">{activeProject.source.stylesheet}</p>
      <p data-testid="stylesheet-language">
        {activeProject.source.stylesheetLanguage}
      </p>
      <button
        type="button"
        onClick={() => actions.createProject("empty", "Second project")}
      >
        Create second project
      </button>
      <button
        type="button"
        onClick={() => actions.switchProject(firstProjectId)}
      >
        Switch to first project
      </button>
      <CssEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} />
    </div>
  );
}

function renderHarness() {
  return render(
    <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
      <Harness />
    </ProjectStoreProvider>,
  );
}

describe("CssEditorPanel", () => {
  it("editing the source updates the active project's stylesheet", async () => {
    const user = userEvent.setup();
    renderHarness();

    const editor = screen.getByRole("textbox", { name: "Stylesheet source" });
    await user.click(editor);
    await user.keyboard("{Control>}{Home}{/Control}Z");

    expect(screen.getByTestId("css-source").textContent?.startsWith("Z")).toBe(
      true,
    );
  });

  it("changing the stylesheet language persists per project across a switch", async () => {
    const user = userEvent.setup();
    renderHarness();

    expect(screen.getByTestId("stylesheet-language")).toHaveTextContent("css");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Stylesheet language" }),
      "scss",
    );
    expect(screen.getByTestId("stylesheet-language")).toHaveTextContent("scss");

    await user.click(
      screen.getByRole("button", { name: "Create second project" }),
    );
    expect(screen.getByTestId("stylesheet-language")).toHaveTextContent("css");

    await user.click(
      screen.getByRole("button", { name: "Switch to first project" }),
    );
    expect(screen.getByTestId("stylesheet-language")).toHaveTextContent("scss");
  });

  it("switching projects loads the correct content without leaking edits", async () => {
    const user = userEvent.setup();
    renderHarness();

    const editor = screen.getByRole("textbox", { name: "Stylesheet source" });
    await user.click(editor);
    await user.keyboard("{Control>}{Home}{/Control}Z");

    await user.click(
      screen.getByRole("button", { name: "Create second project" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Stylesheet source" }),
    ).toHaveTextContent("");

    await user.click(
      screen.getByRole("button", { name: "Switch to first project" }),
    );
    expect(screen.getByTestId("css-source").textContent?.startsWith("Z")).toBe(
      true,
    );
  });
});
