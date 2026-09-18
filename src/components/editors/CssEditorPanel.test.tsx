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

function StaleHarness({ isStale }: { isStale: boolean }) {
  return (
    <div>
      <CssEditorPanel
        preferences={DEFAULT_EDITOR_PREFERENCES}
        isStale={isStale}
      />
    </div>
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

  it("shows an error badge only when hasError is true", () => {
    const repository = createInMemoryProjectRepository();
    const { rerender } = render(
      <ProjectStoreProvider repository={repository}>
        <CssEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} />
      </ProjectStoreProvider>,
    );
    expect(screen.queryByText("Contains an error")).not.toBeInTheDocument();

    rerender(
      <ProjectStoreProvider repository={repository}>
        <CssEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} hasError />
      </ProjectStoreProvider>,
    );
    expect(screen.getByText("Contains an error")).toBeInTheDocument();
  });

  it("does not show a Source/Compiled toggle in CSS mode", () => {
    renderHarness();
    expect(
      screen.queryByRole("button", { name: "Compiled" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Source/Compiled toggle in SCSS mode, defaulting to Source", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Stylesheet language" }),
      "scss",
    );

    expect(screen.getByRole("button", { name: "Source" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Compiled" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("textbox", { name: "Stylesheet source" }),
    ).toBeInTheDocument();
  });

  it("switches to a read-only Compiled CSS view showing compiledCss", async () => {
    const user = userEvent.setup();
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <Harness />
      </ProjectStoreProvider>,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Stylesheet language" }),
      "scss",
    );
    await user.click(screen.getByRole("button", { name: "Compiled" }));

    const compiledView = screen.getByRole("textbox", {
      name: "Compiled CSS output",
    });
    expect(compiledView).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Stylesheet source" }),
    ).not.toBeInTheDocument();
  });

  it("does not show a stale notice when isStale is false", () => {
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <StaleHarness isStale={false} />
      </ProjectStoreProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a stale notice in SCSS mode when isStale is true", async () => {
    const user = userEvent.setup();
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <StaleHarness isStale />
      </ProjectStoreProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Stylesheet language" }),
      "scss",
    );

    expect(screen.getByRole("status")).toHaveTextContent("SCSS compile failed");
  });
});
