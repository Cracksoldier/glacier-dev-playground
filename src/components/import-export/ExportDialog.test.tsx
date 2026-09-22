import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaygroundProject } from "../../models/project";
import type { ScssCompileResult } from "../../preview/scssCompiler";
import type { TsCompileResult } from "../../preview/tsCompiler";

const scssCompileMock = vi.fn(
  async (_source: string, _buildId: string): Promise<ScssCompileResult> => ({
    type: "success",
    css: ".compiled {}",
  }),
);
const scssDisposeMock = vi.fn();

vi.mock("../../preview/scssCompilerClient", () => ({
  createScssCompilerClient: () => ({
    compile: scssCompileMock,
    dispose: scssDisposeMock,
  }),
}));

const tsCompileMock = vi.fn(
  async (
    source: string,
    _scriptLanguage: string,
    _executionMode: string,
    _buildId: string,
  ): Promise<TsCompileResult> => ({
    diagnostics: [],
    emittedJs: source,
    lineMap: null,
  }),
);
const tsDisposeMock = vi.fn();

vi.mock("../../preview/tsCompilerClient", () => ({
  createTsCompilerClient: () => ({
    compile: tsCompileMock,
    dispose: tsDisposeMock,
  }),
}));

const triggerBlobDownloadMock = vi.fn();

vi.mock("../../import-export/downloadBlob", () => ({
  triggerBlobDownload: triggerBlobDownloadMock,
}));

const { default: ExportDialog } = await import("./ExportDialog");

function testProject(
  overrides: Partial<PlaygroundProject> = {},
): PlaygroundProject {
  return {
    schemaVersion: 1,
    id: "project-id",
    title: "My Project",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
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
    resources: [],
    settings: { autoRun: true, previewDebounceMs: 400, preserveConsole: false },
    ...overrides,
  };
}

const originalClipboard = navigator.clipboard;

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
  triggerBlobDownloadMock.mockClear();
  scssCompileMock.mockClear();
  tsCompileMock.mockClear();
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
  Object.defineProperty(navigator, "clipboard", {
    value: originalClipboard,
    configurable: true,
  });
});

describe("ExportDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ExportDialog isOpen={false} onClose={vi.fn()} project={testProject()} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("warns that exported code exposes any secrets it contains", () => {
    render(<ExportDialog isOpen onClose={vi.fn()} project={testProject()} />);

    expect(
      screen.getByText(/Don't put API keys, tokens, or passwords/),
    ).toBeInTheDocument();
  });

  it("downloads project JSON without compiling", async () => {
    const user = userEvent.setup();
    render(<ExportDialog isOpen onClose={vi.fn()} project={testProject()} />);

    await user.click(screen.getByRole("button", { name: "Download JSON" }));

    expect(triggerBlobDownloadMock).toHaveBeenCalledTimes(1);
    const [blob, filename] = triggerBlobDownloadMock.mock.calls[0] as [
      Blob,
      string,
    ];
    expect(blob.type).toBe("application/json");
    expect(filename).toBe("my-project.json");
    expect(scssCompileMock).not.toHaveBeenCalled();
    expect(tsCompileMock).not.toHaveBeenCalled();
  });

  it("downloads standalone HTML after compiling", async () => {
    const user = userEvent.setup();
    render(<ExportDialog isOpen onClose={vi.fn()} project={testProject()} />);

    await user.click(screen.getByRole("button", { name: "Download HTML" }));

    await waitFor(() => {
      expect(triggerBlobDownloadMock).toHaveBeenCalledTimes(1);
    });
    const [blob, filename] = triggerBlobDownloadMock.mock.calls[0] as [
      Blob,
      string,
    ];
    expect(blob.type).toBe("text/html");
    expect(filename).toBe("my-project.html");
  });

  it("shows a compile error for HTML export and leaves JSON export enabled", async () => {
    scssCompileMock.mockResolvedValueOnce({
      type: "failure",
      error: { message: "Undefined variable." },
    });
    const user = userEvent.setup();
    render(
      <ExportDialog
        isOpen
        onClose={vi.fn()}
        project={testProject({
          source: {
            html: "<p>hi</p>",
            stylesheet: "$c: $undefined;",
            stylesheetLanguage: "scss",
            script: "console.log(1);",
            scriptLanguage: "javascript",
            executionMode: "classic",
            headContent: "",
          },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Download HTML" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "SCSS compile failed: Undefined variable.",
    );
    expect(triggerBlobDownloadMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Download JSON" }));
    expect(triggerBlobDownloadMock).toHaveBeenCalledTimes(1);
  });

  it("copies standalone HTML to the clipboard when available", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<ExportDialog isOpen onClose={vi.fn()} project={testProject()} />);

    await user.click(screen.getByRole("button", { name: "Copy HTML" }));

    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("dialog", { name: "Copy manually" }),
    ).not.toBeInTheDocument();
  });

  it("opens the manual-copy fallback dialog when the clipboard write rejects", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<ExportDialog isOpen onClose={vi.fn()} project={testProject()} />);

    await user.click(screen.getByRole("button", { name: "Copy HTML" }));

    expect(
      await screen.findByRole("heading", { name: "Copy manually" }),
    ).toBeInTheDocument();
    const textarea =
      screen.getByLabelText<HTMLTextAreaElement>("Standalone HTML");
    expect(textarea.value).toContain("<p>hi</p>");
  });

  it("opens the manual-copy fallback dialog when the clipboard API is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    render(<ExportDialog isOpen onClose={vi.fn()} project={testProject()} />);

    await user.click(screen.getByRole("button", { name: "Copy HTML" }));

    expect(
      await screen.findByRole("heading", { name: "Copy manually" }),
    ).toBeInTheDocument();
  });

  it("downloads a ZIP archive", async () => {
    const user = userEvent.setup();
    render(<ExportDialog isOpen onClose={vi.fn()} project={testProject()} />);

    await user.click(screen.getByRole("button", { name: "Download ZIP" }));

    await waitFor(() => {
      expect(triggerBlobDownloadMock).toHaveBeenCalledTimes(1);
    });
    const [blob, filename] = triggerBlobDownloadMock.mock.calls[0] as [
      Blob,
      string,
    ];
    expect(blob.type).toBe("application/zip");
    expect(filename).toBe("my-project.zip");
  });

  it("calls onClose and resets state when closed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ExportDialog isOpen onClose={onClose} project={testProject()} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
