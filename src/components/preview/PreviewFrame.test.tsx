import { act, render } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaygroundProject } from "../../models/project";
import { PROJECT_TEMPLATES } from "../../models/templates";
import {
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
} from "../../preview/previewMessage";
import type { ScssCompileResult } from "../../preview/scssCompiler";
import PreviewFrame, { type PreviewRunHandle } from "./PreviewFrame";

let executionCounter = 0;
const beginBuildMock = vi.fn((project: PlaygroundProject) => {
  executionCounter += 1;
  return {
    compilationId: `compilation-${executionCounter}`,
    executionId: `execution-${executionCounter}`,
    source: project.source,
  };
});
const buildDocumentMock = vi.fn(() => "<html></html>");

let staleExecutionId: string | null = null;
const isStaleMock = vi.fn(
  (executionId: string) => executionId === staleExecutionId,
);

vi.mock("../../preview/buildCoordinator", () => ({
  createPreviewBuildCoordinator: () => ({
    beginBuild: beginBuildMock,
    buildDocument: buildDocumentMock,
    isStale: isStaleMock,
  }),
}));

const compileMock = vi.fn(
  async (_source: string, buildId: string): Promise<ScssCompileResult> => ({
    type: "success",
    css: `/* compiled ${buildId} */`,
  }),
);
const disposeMock = vi.fn();

vi.mock("../../preview/scssCompilerClient", () => ({
  createScssCompilerClient: () => ({
    compile: compileMock,
    dispose: disposeMock,
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

function makeScssProject(
  overrides: Partial<PlaygroundProject["settings"]> = {},
): PlaygroundProject {
  const project = makeProject(overrides);
  return {
    ...project,
    source: {
      ...project.source,
      stylesheetLanguage: "scss",
      stylesheet: ".a { .b { color: red; } }",
    },
  };
}

/** Runs `runNow()` and flushes the microtask queue so the fire-and-forget async `runBuild()` (including its awaited SCSS compile step) settles before assertions run. */
async function runAndFlush(ref: RefObject<PreviewRunHandle | null>) {
  await act(async () => {
    ref.current?.runNow();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  beginBuildMock.mockClear();
  buildDocumentMock.mockClear();
  isStaleMock.mockClear();
  compileMock.mockClear();
  disposeMock.mockClear();
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
    expect(beginBuildMock).toHaveBeenCalledTimes(1);
  });

  it("does not run on mount when auto-run is disabled", () => {
    render(<PreviewFrame project={makeProject({ autoRun: false })} />);
    expect(beginBuildMock).not.toHaveBeenCalled();
  });

  it("schedules a debounced build when the source changes with auto-run enabled", () => {
    const project = makeProject({ autoRun: true });
    const { rerender } = render(<PreviewFrame project={project} />);
    expect(beginBuildMock).toHaveBeenCalledTimes(1);

    rerender(
      <PreviewFrame
        project={{
          ...project,
          source: { ...project.source, html: "<p>v2</p>" },
        }}
      />,
    );
    expect(beginBuildMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);
    expect(beginBuildMock).toHaveBeenCalledTimes(2);
  });

  it("collapses rapid source changes into a single debounced build", () => {
    const project = makeProject({ autoRun: true });
    const { rerender } = render(<PreviewFrame project={project} />);
    expect(beginBuildMock).toHaveBeenCalledTimes(1);

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
    expect(beginBuildMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);
    expect(beginBuildMock).toHaveBeenCalledTimes(2);
  });

  it("does not schedule a build on source change when auto-run is disabled", () => {
    const project = makeProject({ autoRun: false });
    const { rerender } = render(<PreviewFrame project={project} />);
    expect(beginBuildMock).not.toHaveBeenCalled();

    rerender(
      <PreviewFrame
        project={{
          ...project,
          source: { ...project.source, html: "<p>v2</p>" },
        }}
      />,
    );
    vi.advanceTimersByTime(1000);
    expect(beginBuildMock).not.toHaveBeenCalled();
  });

  it("runNow() runs immediately, bypassing the debounce", () => {
    const ref = createRef<PreviewRunHandle>();
    render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );
    expect(beginBuildMock).not.toHaveBeenCalled();

    ref.current?.runNow();
    expect(beginBuildMock).toHaveBeenCalledTimes(1);
  });

  it("runNow() cancels a pending debounced run instead of running twice", () => {
    const project = makeProject({ autoRun: true });
    const ref = createRef<PreviewRunHandle>();
    const { rerender } = render(<PreviewFrame project={project} ref={ref} />);
    expect(beginBuildMock).toHaveBeenCalledTimes(1);

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
    expect(beginBuildMock).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(400);
    expect(beginBuildMock).toHaveBeenCalledTimes(2);
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

  it("forwards a valid message from the current build's iframe to onMessage, along with the resolved source", () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const project = makeProject({ autoRun: false });
    const { container } = render(
      <PreviewFrame project={project} onMessage={onMessage} ref={ref} />,
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

    expect(onMessage).toHaveBeenCalledExactlyOnceWith(message, project.source);
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

describe("PreviewFrame SCSS compilation", () => {
  it("does not create the SCSS compiler client for a CSS-mode project", async () => {
    const ref = createRef<PreviewRunHandle>();
    render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);

    expect(compileMock).not.toHaveBeenCalled();
    expect(buildDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("compiles the stylesheet via the SCSS client, keyed by compilationId, for an SCSS-mode project", async () => {
    const ref = createRef<PreviewRunHandle>();
    render(
      <PreviewFrame project={makeScssProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);

    expect(compileMock).toHaveBeenCalledExactlyOnceWith(
      ".a { .b { color: red; } }",
      "compilation-1",
    );
  });

  it("on compile success, calls onScssCompileSuccess and builds the document with the compiled CSS substituted in", async () => {
    const ref = createRef<PreviewRunHandle>();
    const onScssCompileSuccess = vi.fn();
    render(
      <PreviewFrame
        project={makeScssProject({ autoRun: false })}
        onScssCompileSuccess={onScssCompileSuccess}
        ref={ref}
      />,
    );

    await runAndFlush(ref);

    expect(onScssCompileSuccess).toHaveBeenCalledExactlyOnceWith(
      "/* compiled compilation-1 */",
      "compilation-1",
    );
    expect(buildDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({ stylesheet: "/* compiled compilation-1 */" }),
      "execution-1",
    );
  });

  it("on compile failure, calls onScssCompileError and does not build a document", async () => {
    compileMock.mockResolvedValueOnce({
      type: "failure",
      error: { message: "Undefined variable." },
    });
    const ref = createRef<PreviewRunHandle>();
    const onScssCompileError = vi.fn();
    render(
      <PreviewFrame
        project={makeScssProject({ autoRun: false })}
        onScssCompileError={onScssCompileError}
        ref={ref}
      />,
    );

    await runAndFlush(ref);

    expect(onScssCompileError).toHaveBeenCalledExactlyOnceWith(
      { message: "Undefined variable." },
      "compilation-1",
    );
    expect(buildDocumentMock).not.toHaveBeenCalled();
  });

  it("discards a compile result that has gone stale by the time it resolves, without building a document", async () => {
    const ref = createRef<PreviewRunHandle>();
    render(
      <PreviewFrame project={makeScssProject({ autoRun: false })} ref={ref} />,
    );

    await act(async () => {
      ref.current?.runNow();
      staleExecutionId = "execution-1";
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(buildDocumentMock).not.toHaveBeenCalled();
  });

  it("disposes the SCSS compiler client on unmount, once it has been created", async () => {
    const ref = createRef<PreviewRunHandle>();
    const { unmount } = render(
      <PreviewFrame project={makeScssProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);
    unmount();

    expect(disposeMock).toHaveBeenCalledTimes(1);
  });
});
