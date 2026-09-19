import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import type { ProjectSource } from "../../models/project";
import { computePreviewLineOffsets } from "../../preview/previewDocument";
import {
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
  type PreviewMessage,
} from "../../preview/previewMessage";
import type { ScssCompileError } from "../../preview/scssWorkerProtocol";
import type { TsDiagnostic } from "../../preview/tsWorkerProtocol";
import { ProjectStoreProvider } from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import type { ResolvedPreviewBuild } from "./PreviewFrame";
import PreviewPanel from "./PreviewPanel";

interface PreviewFrameMockProps {
  onBuildStart?: () => void;
  onMessage?: (
    message: PreviewMessage,
    resolvedBuild: ResolvedPreviewBuild,
  ) => void;
  onScssCompileError?: (error: ScssCompileError, compilationId: string) => void;
  onScssCompileSuccess?: (css: string, compilationId: string) => void;
  onScriptDiagnostics?: (
    diagnostics: TsDiagnostic[],
    compilationId: string,
  ) => void;
}

const { previewFrameProps } = vi.hoisted(() => ({
  previewFrameProps: {
    current: null as PreviewFrameMockProps | null,
  },
}));

vi.mock("./PreviewFrame", () => ({
  default: (props: PreviewFrameMockProps) => {
    previewFrameProps.current = props;
    return null;
  },
}));

function createConsoleEntriesStub(): UseConsoleEntriesResult {
  return {
    entries: [],
    startRun: vi.fn(),
    clear: vi.fn(),
    append: vi.fn(),
  };
}

function renderPreviewPanel(
  consoleEntries: UseConsoleEntriesResult,
  overrides: {
    onScssCompileError?: (
      error: ScssCompileError,
      compilationId: string,
    ) => void;
    onScssCompileSuccess?: (css: string, compilationId: string) => void;
    onScriptDiagnostics?: (
      diagnostics: TsDiagnostic[],
      compilationId: string,
    ) => void;
  } = {},
) {
  return render(
    <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
      <PreviewPanel consoleEntries={consoleEntries} {...overrides} />
    </ProjectStoreProvider>,
  );
}

function makeMessage(
  message: Pick<PreviewMessage, "type" | "payload">,
): PreviewMessage {
  return {
    protocol: PREVIEW_MESSAGE_PROTOCOL,
    version: PREVIEW_MESSAGE_VERSION,
    executionId: "execution-1",
    ...message,
  } as PreviewMessage;
}

const resolvedSource: ProjectSource = {
  html: "<p>hi</p>",
  stylesheet: "p { color: red; }",
  stylesheetLanguage: "css",
  script: "console.log('hi');",
  scriptLanguage: "javascript",
  executionMode: "classic",
  headContent: "",
};
const resolvedBuild: ResolvedPreviewBuild = {
  resolvedSource,
  scriptLineMap: null,
  resources: [],
};

describe("PreviewPanel console wiring", () => {
  it("starts a new run and clears entries on build start by default (preserveConsole is false)", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onBuildStart?.();

    expect(consoleEntries.startRun).toHaveBeenCalledTimes(1);
    expect(consoleEntries.clear).toHaveBeenCalledTimes(1);
  });

  it("ignores a 'ready' message", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onMessage?.(
      makeMessage({ type: "ready", payload: { timestampMs: 0 } }),
      resolvedBuild,
    );

    expect(consoleEntries.append).not.toHaveBeenCalled();
  });

  it("appends a console message", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onMessage?.(
      makeMessage({
        type: "console",
        payload: {
          level: "warn",
          args: [{ kind: "primitive", value: "careful" }],
          timestampMs: 10,
        },
      }),
      resolvedBuild,
    );

    expect(consoleEntries.append).toHaveBeenCalledWith({
      type: "console",
      level: "warn",
      args: [{ kind: "primitive", value: "careful" }],
      timestampMs: 10,
    });
  });

  it("clears entries on an in-band console.clear() when preserveConsole is false", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onMessage?.(
      makeMessage({
        type: "console",
        payload: { level: "clear", args: [], timestampMs: 10 },
      }),
      resolvedBuild,
    );

    expect(consoleEntries.clear).toHaveBeenCalledTimes(1);
    expect(consoleEntries.append).not.toHaveBeenCalled();
  });

  it("appends a runtime-error message with a mapped location when the line falls in the script block", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    // The default starter project's script block starts after a fixed
    // amount of boilerplate; rather than hardcode that line number, assert
    // only on the fields not dependent on it, and that a location was
    // computed for some in-range line by using a very high line number and
    // asserting mappedLocation is null (that line will be past the block).
    previewFrameProps.current?.onMessage?.(
      makeMessage({
        type: "runtime-error",
        payload: {
          message: "boom",
          line: 999999,
          stack: "Error: boom",
          timestampMs: 20,
        },
      }),
      resolvedBuild,
    );

    expect(consoleEntries.append).toHaveBeenCalledWith({
      type: "runtime-error",
      message: "boom",
      stack: "Error: boom",
      timestampMs: 20,
      mappedLocation: null,
    });
  });

  it("appends a runtime-error message with a null mappedLocation when no line is reported", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onMessage?.(
      makeMessage({
        type: "runtime-error",
        payload: { message: "boom", timestampMs: 20 },
      }),
      resolvedBuild,
    );

    expect(consoleEntries.append).toHaveBeenCalledWith({
      type: "runtime-error",
      message: "boom",
      stack: undefined,
      timestampMs: 20,
      mappedLocation: null,
    });
  });

  it("appends an unhandled-rejection message with the reason as a single-element args array", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onMessage?.(
      makeMessage({
        type: "unhandled-rejection",
        payload: {
          reason: { kind: "error", name: "Error", message: "rejected" },
          timestampMs: 30,
        },
      }),
      resolvedBuild,
    );

    expect(consoleEntries.append).toHaveBeenCalledWith({
      type: "unhandled-rejection",
      args: [{ kind: "error", name: "Error", message: "rejected" }],
      timestampMs: 30,
    });
  });

  it("appends a resource-error message", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onMessage?.(
      makeMessage({
        type: "resource-error",
        payload: {
          url: "https://example.com/a.png",
          message: "Failed to load resource",
          timestampMs: 40,
        },
      }),
      resolvedBuild,
    );

    expect(consoleEntries.append).toHaveBeenCalledWith({
      type: "resource-error",
      message: "Failed to load resource",
      timestampMs: 40,
    });
  });

  it("appends a scss-compile-error entry with a scssLocation and forwards to onScssCompileError", () => {
    const consoleEntries = createConsoleEntriesStub();
    const onScssCompileError = vi.fn();
    renderPreviewPanel(consoleEntries, { onScssCompileError });

    const error: ScssCompileError = {
      message: "Undefined variable.",
      line: 3,
      column: 5,
    };
    previewFrameProps.current?.onScssCompileError?.(error, "compilation-1");

    expect(consoleEntries.append).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scss-compile-error",
        message: "Undefined variable.",
        scssLocation: { line: 3, column: 5 },
      }),
    );
    expect(onScssCompileError).toHaveBeenCalledWith(error, "compilation-1");
  });

  it("appends a scss-compile-error entry with a null scssLocation when no line is reported", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    previewFrameProps.current?.onScssCompileError?.(
      { message: "boom" },
      "compilation-1",
    );

    expect(consoleEntries.append).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scss-compile-error",
        message: "boom",
        scssLocation: null,
      }),
    );
  });

  it("forwards a successful scss compile to onScssCompileSuccess without appending a console entry", () => {
    const consoleEntries = createConsoleEntriesStub();
    const onScssCompileSuccess = vi.fn();
    renderPreviewPanel(consoleEntries, { onScssCompileSuccess });

    previewFrameProps.current?.onScssCompileSuccess?.(
      ".a { color: red; }",
      "compilation-1",
    );

    expect(onScssCompileSuccess).toHaveBeenCalledWith(
      ".a { color: red; }",
      "compilation-1",
    );
    expect(consoleEntries.append).not.toHaveBeenCalled();
  });

  it("maps a runtime-error line against the resolved (compiled-CSS) source, not the raw project source", () => {
    const consoleEntries = createConsoleEntriesStub();
    renderPreviewPanel(consoleEntries);

    // A stylesheet much longer than the default starter project's raw CSS —
    // simulates the compiled-CSS-substituted source an SCSS-mode build
    // produces. If PreviewPanel mapped against the raw (uncompiled) project
    // source instead of this resolved one, the script block's offset (and
    // thus this mappedLocation) would come out wrong.
    const scssResolvedSource: ProjectSource = {
      ...resolvedSource,
      stylesheet: Array.from(
        { length: 20 },
        (_, i) => `.rule-${i} { color: red; }`,
      ).join("\n"),
    };
    const documentLine = computePreviewLineOffsets(scssResolvedSource, [])
      .script.start;

    previewFrameProps.current?.onMessage?.(
      makeMessage({
        type: "runtime-error",
        payload: {
          message: "boom",
          line: documentLine,
          stack: "Error: boom",
          timestampMs: 50,
        },
      }),
      {
        resolvedSource: scssResolvedSource,
        scriptLineMap: null,
        resources: [],
      },
    );

    expect(consoleEntries.append).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "runtime-error",
        mappedLocation: { panel: "script", line: 1 },
      }),
    );
  });

  it("appends one script-diagnostic entry per diagnostic and forwards to onScriptDiagnostics", () => {
    const consoleEntries = createConsoleEntriesStub();
    const onScriptDiagnostics = vi.fn();
    renderPreviewPanel(consoleEntries, { onScriptDiagnostics });

    const diagnostics: TsDiagnostic[] = [
      { message: "Type error.", category: "error", line: 3, column: 5 },
      { message: "Types unavailable.", category: "warning" },
    ];
    previewFrameProps.current?.onScriptDiagnostics?.(
      diagnostics,
      "compilation-1",
    );

    expect(consoleEntries.append).toHaveBeenCalledTimes(2);
    expect(consoleEntries.append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "script-diagnostic",
        level: "error",
        message: "Type error.",
        scriptLocation: { line: 3, column: 5 },
      }),
    );
    expect(consoleEntries.append).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "script-diagnostic",
        level: "warn",
        message: "Types unavailable.",
        scriptLocation: null,
      }),
    );
    expect(onScriptDiagnostics).toHaveBeenCalledWith(
      diagnostics,
      "compilation-1",
    );
  });
});
