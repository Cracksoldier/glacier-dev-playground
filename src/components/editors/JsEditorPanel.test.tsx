import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_PREFERENCES } from "../../preferences/editorPreferences";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import type { CodeMirrorEditorDiagnostic } from "./CodeMirrorEditor";
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

// diagnosticErrors is applied via a CodeMirror effect keyed on the prop
// reference, not on doc content — this toggle lets a test type content into
// the (initially empty) script first, then apply diagnostics against the
// resulting non-empty doc, matching how a real compile-after-edit occurs.
function DiagnosticsHarness({
  diagnosticErrors,
}: {
  diagnosticErrors: CodeMirrorEditorDiagnostic[];
}) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setShowDiagnostics(true)}>
        Show diagnostics
      </button>
      <JsEditorPanel
        preferences={DEFAULT_EDITOR_PREFERENCES}
        diagnosticErrors={showDiagnostics ? diagnosticErrors : null}
      />
    </div>
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

  it("shows an error badge only when hasError is true", () => {
    const repository = createInMemoryProjectRepository();
    const { rerender } = render(
      <ProjectStoreProvider repository={repository}>
        <JsEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} />
      </ProjectStoreProvider>,
    );
    expect(screen.queryByText("Contains an error")).not.toBeInTheDocument();

    rerender(
      <ProjectStoreProvider repository={repository}>
        <JsEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} hasError />
      </ProjectStoreProvider>,
    );
    expect(screen.getByText("Contains an error")).toBeInTheDocument();
  });

  it("does not show a stale notice when isStale is false", () => {
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <JsEditorPanel
          preferences={DEFAULT_EDITOR_PREFERENCES}
          isStale={false}
        />
      </ProjectStoreProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a stale notice naming the active script language when isStale is true", async () => {
    const user = userEvent.setup();
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <JsEditorPanel preferences={DEFAULT_EDITOR_PREFERENCES} isStale />
      </ProjectStoreProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "JavaScript compile failed",
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Script language" }),
      "typescript",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "TypeScript compile failed",
    );
  });

  it("renders a diagnostic marker for each entry in diagnosticErrors", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <DiagnosticsHarness
          diagnosticErrors={[
            { message: "Type error", line: 1, severity: "error" },
          ]}
        />
      </ProjectStoreProvider>,
    );

    await user.click(screen.getByRole("textbox", { name: "Script source" }));
    await user.keyboard("const a = 1;");
    await user.click(screen.getByRole("button", { name: "Show diagnostics" }));

    expect(container.querySelector(".cm-lintRange-error")).not.toBeNull();
  });
});
