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
import JsEditorPanel from "./JsEditorPanel";

function Harness() {
  const { activeProject, actions } = useProjectStore();
  const firstProjectId = useRef(activeProject.id).current;

  return (
    <div>
      <p data-testid="script-source">{activeProject.source.script}</p>
      <p data-testid="script-language">{activeProject.source.scriptLanguage}</p>
      <p data-testid="execution-mode">{activeProject.source.executionMode}</p>
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
      <JsEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} />
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

describe("JsEditorPanel", () => {
  it("editing the source updates the active project's script", async () => {
    const user = userEvent.setup();
    renderHarness();

    const editor = screen.getByRole("textbox", { name: "Script source" });
    await user.click(editor);
    await user.keyboard("Z");

    expect(screen.getByTestId("script-source")).toHaveTextContent("Z");
  });

  it("changing the script language persists per project across a switch", async () => {
    const user = userEvent.setup();
    renderHarness();

    expect(screen.getByTestId("script-language")).toHaveTextContent(
      "javascript",
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Script language" }),
      "typescript",
    );
    expect(screen.getByTestId("script-language")).toHaveTextContent(
      "typescript",
    );

    await user.click(
      screen.getByRole("button", { name: "Create second project" }),
    );
    expect(screen.getByTestId("script-language")).toHaveTextContent(
      "javascript",
    );

    await user.click(
      screen.getByRole("button", { name: "Switch to first project" }),
    );
    expect(screen.getByTestId("script-language")).toHaveTextContent(
      "typescript",
    );
  });

  it("changing the execution mode persists per project across a switch", async () => {
    const user = userEvent.setup();
    renderHarness();

    expect(screen.getByTestId("execution-mode")).toHaveTextContent("classic");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Execution mode" }),
      "module",
    );
    expect(screen.getByTestId("execution-mode")).toHaveTextContent("module");

    await user.click(
      screen.getByRole("button", { name: "Create second project" }),
    );
    expect(screen.getByTestId("execution-mode")).toHaveTextContent("classic");

    await user.click(
      screen.getByRole("button", { name: "Switch to first project" }),
    );
    expect(screen.getByTestId("execution-mode")).toHaveTextContent("module");
  });

  it("switching projects loads the correct content without leaking edits", async () => {
    const user = userEvent.setup();
    renderHarness();

    const editor = screen.getByRole("textbox", { name: "Script source" });
    await user.click(editor);
    await user.keyboard("Z");

    await user.click(
      screen.getByRole("button", { name: "Create second project" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Script source" }),
    ).toHaveTextContent("");

    await user.click(
      screen.getByRole("button", { name: "Switch to first project" }),
    );
    expect(screen.getByTestId("script-source")).toHaveTextContent("Z");
  });
});
