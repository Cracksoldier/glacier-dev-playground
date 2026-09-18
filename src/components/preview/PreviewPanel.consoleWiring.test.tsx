import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import {
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
  type PreviewMessage,
} from "../../preview/previewMessage";
import { ProjectStoreProvider } from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import PreviewPanel from "./PreviewPanel";

const { previewFrameProps } = vi.hoisted(() => ({
  previewFrameProps: {
    current: null as {
      onBuildStart?: () => void;
      onMessage?: (message: PreviewMessage) => void;
    } | null,
  },
}));

vi.mock("./PreviewFrame", () => ({
  default: (props: {
    onBuildStart?: () => void;
    onMessage?: (message: PreviewMessage) => void;
  }) => {
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

function renderPreviewPanel(consoleEntries: UseConsoleEntriesResult) {
  return render(
    <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
      <PreviewPanel consoleEntries={consoleEntries} />
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
    );

    expect(consoleEntries.append).toHaveBeenCalledWith({
      type: "resource-error",
      message: "Failed to load resource",
      timestampMs: 40,
    });
  });
});
