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
import HtmlEditorPanel from "./HtmlEditorPanel";

function Harness() {
  const { activeProject, actions, isDirty } = useProjectStore();
  const firstProjectId = useRef(activeProject.id).current;

  return (
    <div>
      <p data-testid="html-source">{activeProject.source.html}</p>
      <p data-testid="is-dirty">{String(isDirty)}</p>
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
      <HtmlEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} />
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

describe("HtmlEditorPanel", () => {
  it("does not mark the store dirty merely by mounting", () => {
    renderHarness();

    expect(screen.getByTestId("is-dirty")).toHaveTextContent("false");
  });

  it("editing the source updates the active project's html", async () => {
    const user = userEvent.setup();
    renderHarness();

    const editor = screen.getByRole("textbox", { name: "HTML source" });
    await user.click(editor);
    await user.keyboard("{Control>}{Home}{/Control}Z");

    expect(screen.getByTestId("html-source").textContent?.startsWith("Z")).toBe(
      true,
    );
  });

  it("switching projects loads the correct content without leaking edits", async () => {
    const user = userEvent.setup();
    renderHarness();

    const editor = screen.getByRole("textbox", { name: "HTML source" });
    await user.click(editor);
    await user.keyboard("{Control>}{Home}{/Control}Z");

    await user.click(
      screen.getByRole("button", { name: "Create second project" }),
    );
    expect(
      screen.getByRole("textbox", { name: "HTML source" }),
    ).toHaveTextContent("");

    await user.click(
      screen.getByRole("button", { name: "Switch to first project" }),
    );
    expect(screen.getByTestId("html-source").textContent?.startsWith("Z")).toBe(
      true,
    );
  });

  it("shows an error badge only when hasError is true", () => {
    const repository = createInMemoryProjectRepository();
    const { rerender } = render(
      <ProjectStoreProvider repository={repository}>
        <HtmlEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} />
      </ProjectStoreProvider>,
    );
    expect(screen.queryByText("Contains an error")).not.toBeInTheDocument();

    rerender(
      <ProjectStoreProvider repository={repository}>
        <HtmlEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} hasError />
      </ProjectStoreProvider>,
    );
    expect(screen.getByText("Contains an error")).toBeInTheDocument();
  });
});
