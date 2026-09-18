import { render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaygroundProject } from "../../models/project";
import { PROJECT_TEMPLATES } from "../../models/templates";
import {
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
} from "../../preview/previewMessage";
import PreviewFrame, { type PreviewRunHandle } from "./PreviewFrame";

let executionCounter = 0;
const startBuildMock = vi.fn(() => {
  executionCounter += 1;
  return {
    compilationId: `compilation-${executionCounter}`,
    executionId: `execution-${executionCounter}`,
    document: "<html></html>",
  };
});

let staleExecutionId: string | null = null;
const isStaleMock = vi.fn(
  (executionId: string) => executionId === staleExecutionId,
);

vi.mock("../../preview/buildCoordinator", () => ({
  createPreviewBuildCoordinator: () => ({
    startBuild: startBuildMock,
    isStale: isStaleMock,
  }),
}));

function makeReadyMessage(executionId: string) {
  return {
    protocol: PREVIEW_MESSAGE_PROTOCOL,
    version: PREVIEW_MESSAGE_VERSION,
    executionId,
    type: "ready" as const,
    payload: { timestampMs: 0 },
  };
}

function makeProject(
  overrides: Partial<PlaygroundProject["settings"]> = {},
): PlaygroundProject {
  const project = PROJECT_TEMPLATES["basic-html"].create();
  return {
    ...project,
    settings: { ...project.settings, previewDebounceMs: 400, ...overrides },
  };
}

beforeEach(() => {
  startBuildMock.mockClear();
  isStaleMock.mockClear();
  executionCounter = 0;
  staleExecutionId = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PreviewFrame", () => {
  it("runs once immediately on mount when auto-run is enabled", () => {
    render(<PreviewFrame project={makeProject({ autoRun: true })} />);
    expect(startBuildMock).toHaveBeenCalledTimes(1);
  });

  it("does not run on mount when auto-run is disabled", () => {
    render(<PreviewFrame project={makeProject({ autoRun: false })} />);
    expect(startBuildMock).not.toHaveBeenCalled();
  });

  it("schedules a debounced build when the source changes with auto-run enabled", () => {
    const project = makeProject({ autoRun: true });
    const { rerender } = render(<PreviewFrame project={project} />);
    expect(startBuildMock).toHaveBeenCalledTimes(1);

    rerender(
      <PreviewFrame
        project={{
          ...project,
          source: { ...project.source, html: "<p>v2</p>" },
        }}
      />,
    );
    expect(startBuildMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);
    expect(startBuildMock).toHaveBeenCalledTimes(2);
  });

  it("collapses rapid source changes into a single debounced build", () => {
    const project = makeProject({ autoRun: true });
    const { rerender } = render(<PreviewFrame project={project} />);
    expect(startBuildMock).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i += 1) {
      rerender(
        <PreviewFrame
          project={{
            ...project,
            source: { ...project.source, html: `<p>v${i}</p>` },
          }}
        />,
      );
      vi.advanceTimersByTime(100);
    }
    expect(startBuildMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);
    expect(startBuildMock).toHaveBeenCalledTimes(2);
  });

  it("does not schedule a build on source change when auto-run is disabled", () => {
    const project = makeProject({ autoRun: false });
    const { rerender } = render(<PreviewFrame project={project} />);
    expect(startBuildMock).not.toHaveBeenCalled();

    rerender(
      <PreviewFrame
        project={{
          ...project,
          source: { ...project.source, html: "<p>v2</p>" },
        }}
      />,
    );
    vi.advanceTimersByTime(1000);
    expect(startBuildMock).not.toHaveBeenCalled();
  });

  it("runNow() runs immediately, bypassing the debounce", () => {
    const ref = createRef<PreviewRunHandle>();
    render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );
    expect(startBuildMock).not.toHaveBeenCalled();

    ref.current?.runNow();
    expect(startBuildMock).toHaveBeenCalledTimes(1);
  });

  it("runNow() cancels a pending debounced run instead of running twice", () => {
    const project = makeProject({ autoRun: true });
    const ref = createRef<PreviewRunHandle>();
    const { rerender } = render(<PreviewFrame project={project} ref={ref} />);
    expect(startBuildMock).toHaveBeenCalledTimes(1);

    rerender(
      <PreviewFrame
        project={{
          ...project,
          source: { ...project.source, html: "<p>v2</p>" },
        }}
        ref={ref}
      />,
    );
    ref.current?.runNow();
    expect(startBuildMock).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(400);
    expect(startBuildMock).toHaveBeenCalledTimes(2);
  });

  it("calls onBuildStart with the new execution ID as soon as a build starts", () => {
    const ref = createRef<PreviewRunHandle>();
    const onBuildStart = vi.fn();
    render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onBuildStart={onBuildStart}
        ref={ref}
      />,
    );

    ref.current?.runNow();

    expect(onBuildStart).toHaveBeenCalledExactlyOnceWith("execution-1");
  });

  it("forwards a valid message from the current build's iframe to onMessage", () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const { container } = render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onMessage={onMessage}
        ref={ref}
      />,
    );

    ref.current?.runNow();
    const iframe = container.querySelector("iframe");
    const message = makeReadyMessage("execution-1");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: message,
        source: iframe?.contentWindow,
      }),
    );

    expect(onMessage).toHaveBeenCalledExactlyOnceWith(message);
  });

  it("ignores a message whose source is not the current build's iframe", () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onMessage={onMessage}
        ref={ref}
      />,
    );

    ref.current?.runNow();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeReadyMessage("execution-1"),
        source: null,
      }),
    );

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("ignores a message that does not match the preview protocol shape", () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const { container } = render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onMessage={onMessage}
        ref={ref}
      />,
    );

    ref.current?.runNow();
    const iframe = container.querySelector("iframe");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { not: "a preview message" },
        source: iframe?.contentWindow,
      }),
    );

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("ignores a message whose execution ID the coordinator considers stale", () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const { container } = render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onMessage={onMessage}
        ref={ref}
      />,
    );

    ref.current?.runNow();
    const iframe = container.querySelector("iframe");
    staleExecutionId = "execution-1";

    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeReadyMessage("execution-1"),
        source: iframe?.contentWindow,
      }),
    );

    expect(onMessage).not.toHaveBeenCalled();
  });
});
