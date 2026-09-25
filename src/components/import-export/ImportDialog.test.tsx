import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROJECT_SCHEMA_VERSION } from "../../models/project";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import ImportDialog from "./ImportDialog";

function validProjectJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: "some-id",
    title: "Imported Project",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    trusted: true,
    source: {
      html: "<p>hi</p>",
      stylesheet: "p { color: red; }",
      stylesheetLanguage: "css",
      script: "console.log(1);",
      scriptLanguage: "javascript",
      executionMode: "classic",
      headContent: "",
    },
    resources: [
      {
        id: "res-1",
        name: "Lodash",
        url: "https://example.com/lodash.js",
        type: "script",
        enabled: true,
        order: 0,
      },
    ],
    settings: {
      autoRun: true,
      previewDebounceMs: 400,
      preserveConsole: false,
    },
    ...overrides,
  });
}

function Harness({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useProjectStore();
  return <ImportDialog isOpen={isOpen} onClose={onClose} />;
}

function renderDialog(isOpen: boolean, onClose: () => void) {
  return render(
    <ProjectStoreProvider>
      <Harness isOpen={isOpen} onClose={onClose} />
    </ProjectStoreProvider>,
  );
}

/** Tracks isOpen itself (closing on onClose) so closing behavior is observable, and exposes store state for assertions. */
function StatefulHarness() {
  const [isOpen, setOpen] = useState(true);
  const { projects, activeProject } = useProjectStore();
  return (
    <>
      <p data-testid="count">{projects.length}</p>
      <p data-testid="active-title">{activeProject.title}</p>
      <ImportDialog isOpen={isOpen} onClose={() => setOpen(false)} />
    </>
  );
}

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

describe("ImportDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog(false, vi.fn());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an inline error and stays on the input step for invalid JSON, without dispatching", async () => {
    const user = userEvent.setup();
    renderDialog(true, vi.fn());

    const textarea = screen.getByLabelText(/paste project json/i);
    await user.click(textarea);
    await user.paste("{not json");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The file is not valid JSON.",
    );
    expect(
      screen.queryByRole("radio", { name: /Add as a new project/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a preview and mode choice for valid JSON", async () => {
    const user = userEvent.setup();
    renderDialog(true, vi.fn());

    const textarea = screen.getByLabelText(/paste project json/i);
    await user.click(textarea);
    await user.paste(validProjectJson());
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText(/— 1 resource/)).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Add as a new project" }),
    ).toBeChecked();
  });

  it("adds a new project immediately without a confirm step when mode is add", async () => {
    const user = userEvent.setup();

    render(
      <ProjectStoreProvider>
        <StatefulHarness />
      </ProjectStoreProvider>,
    );

    const textarea = screen.getByLabelText(/paste project json/i);
    await user.click(textarea);
    await user.paste(validProjectJson());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requires confirmation before replacing the current project", async () => {
    const user = userEvent.setup();
    renderDialog(true, vi.fn());

    const textarea = screen.getByLabelText(/paste project json/i);
    await user.click(textarea);
    await user.paste(validProjectJson());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(
      screen.getByRole("radio", { name: /Replace the current project/i }),
    );
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
  });

  it("replaces the current project's content on confirm", async () => {
    const user = userEvent.setup();

    render(
      <ProjectStoreProvider>
        <StatefulHarness />
      </ProjectStoreProvider>,
    );

    const textarea = screen.getByLabelText(/paste project json/i);
    await user.click(textarea);
    await user.paste(validProjectJson());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(
      screen.getByRole("radio", { name: /Replace the current project/i }),
    );
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(screen.getByRole("button", { name: "Replace" }));

    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("active-title")).toHaveTextContent(
      "Imported Project",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose and resets state when cancelling", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog(true, onClose);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rejects an oversized file with the size-limit error", async () => {
    const user = userEvent.setup();
    renderDialog(true, vi.fn());

    const oversized = "x".repeat(6 * 1024 * 1024);
    const file = new File([oversized], "huge.json", {
      type: "application/json",
    });

    const readSpy = vi.spyOn(FileReader.prototype, "readAsText");
    const input = screen.getByLabelText(/import from a file/i);
    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /exceeds the 5 MB import size limit/i,
    );
    expect(readSpy).not.toHaveBeenCalled();
    readSpy.mockRestore();
  });
});
