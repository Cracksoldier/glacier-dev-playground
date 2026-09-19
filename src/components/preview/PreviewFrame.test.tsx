import { act, render } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaygroundProject } from "../../models/project";
import type { ExternalResource } from "../../models/resource";
import { PROJECT_TEMPLATES } from "../../models/templates";
import {
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
} from "../../preview/previewMessage";
import type { ScssCompileResult } from "../../preview/scssCompiler";
import type { TsCompileResult } from "../../preview/tsCompiler";
import PreviewFrame, { type PreviewRunHandle } from "./PreviewFrame";

let executionCounter = 0;
const beginBuildMock = vi.fn((project: PlaygroundProject) => {
  executionCounter += 1;
  return {
    compilationId: `compilation-${executionCounter}`,
    executionId: `execution-${executionCounter}`,
    source: project.source,
    resources: project.resources,
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

function makeReadyMessage(executionId: string) {
  return {
    protocol: PREVIEW_MESSAGE_PROTOCOL,
    version: PREVIEW_MESSAGE_VERSION,
    executionId,
    type: "ready" as const,
    payload: { timestampMs: 0 },
  };
}

function makeResourcesReadyMessage(executionId: string) {
  return {
    protocol: PREVIEW_MESSAGE_PROTOCOL,
    version: PREVIEW_MESSAGE_VERSION,
    executionId,
    type: "resources-ready" as const,
    payload: { timestampMs: 0 },
  };
}

function makeResourceErrorMessage(
  executionId: string,
  payload: { url: string; message: string },
) {
  return {
    protocol: PREVIEW_MESSAGE_PROTOCOL,
    version: PREVIEW_MESSAGE_VERSION,
    executionId,
    type: "resource-error" as const,
    payload: { ...payload, timestampMs: 0 },
  };
}

function makeResource(
  overrides: Partial<ExternalResource> = {},
): ExternalResource {
  return {
    id: "resource-1",
    name: "Example script",
    url: "https://example.com/a.js",
    type: "script",
    enabled: true,
    order: 0,
    ...overrides,
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
  tsCompileMock.mockClear();
  tsDisposeMock.mockClear();
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

  it("forwards a valid message from the current build's iframe to onMessage, along with the resolved build", async () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const project = makeProject({ autoRun: false });
    const { container } = render(
      <PreviewFrame project={project} onMessage={onMessage} ref={ref} />,
    );

    await runAndFlush(ref);
    const iframe = container.querySelector("iframe");
    const message = makeReadyMessage("execution-1");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: message,
        source: iframe?.contentWindow,
      }),
    );

    expect(onMessage).toHaveBeenCalledExactlyOnceWith(message, {
      resolvedSource: project.source,
      scriptLineMap: null,
      resources: project.resources,
    });
  });

  it("ignores a message whose source is not the current build's iframe", async () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onMessage={onMessage}
        ref={ref}
      />,
    );

    await runAndFlush(ref);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeReadyMessage("execution-1"),
        source: null,
      }),
    );

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("ignores a message that does not match the preview protocol shape", async () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const { container } = render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onMessage={onMessage}
        ref={ref}
      />,
    );

    await runAndFlush(ref);
    const iframe = container.querySelector("iframe");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { not: "a preview message" },
        source: iframe?.contentWindow,
      }),
    );

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("ignores a message whose execution ID the coordinator considers stale", async () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const { container } = render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onMessage={onMessage}
        ref={ref}
      />,
    );

    await runAndFlush(ref);
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
      [],
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

describe("PreviewFrame script compilation", () => {
  it("compiles the script via the TS client, keyed by compilationId, for a JS-mode project", async () => {
    const ref = createRef<PreviewRunHandle>();
    const project = makeProject({ autoRun: false });
    render(<PreviewFrame project={project} ref={ref} />);

    await runAndFlush(ref);

    expect(tsCompileMock).toHaveBeenCalledExactlyOnceWith(
      project.source.script,
      "javascript",
      "classic",
      "compilation-1",
    );
  });

  it("calls onScriptDiagnostics with every diagnostic from the compile", async () => {
    const diagnostics = [{ message: "note", category: "warning" as const }];
    tsCompileMock.mockResolvedValueOnce({
      diagnostics,
      emittedJs: "console.log(1);",
      lineMap: null,
    });
    const ref = createRef<PreviewRunHandle>();
    const onScriptDiagnostics = vi.fn();
    render(
      <PreviewFrame
        project={makeProject({ autoRun: false })}
        onScriptDiagnostics={onScriptDiagnostics}
        ref={ref}
      />,
    );

    await runAndFlush(ref);

    expect(onScriptDiagnostics).toHaveBeenCalledExactlyOnceWith(
      diagnostics,
      "compilation-1",
    );
    expect(buildDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("on a blocking error diagnostic, does not build a document", async () => {
    tsCompileMock.mockResolvedValueOnce({
      diagnostics: [
        { message: "boom", category: "error" as const, line: 1, column: 1 },
      ],
      emittedJs: null,
      lineMap: null,
    });
    const ref = createRef<PreviewRunHandle>();
    render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);

    expect(buildDocumentMock).not.toHaveBeenCalled();
  });

  it("keeps the authored source as the executed script in JS mode, even if the emit differs", async () => {
    tsCompileMock.mockResolvedValueOnce({
      diagnostics: [],
      emittedJs: "/* a different emit */",
      lineMap: null,
    });
    const ref = createRef<PreviewRunHandle>();
    const project = makeProject({ autoRun: false });
    render(<PreviewFrame project={project} ref={ref} />);

    await runAndFlush(ref);

    expect(buildDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({ script: project.source.script }),
      "execution-1",
      [],
    );
  });

  it("substitutes the emitted JS and carries the line map for a TS-mode project", async () => {
    const lineMap = [1, 2];
    tsCompileMock.mockResolvedValueOnce({
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap,
    });
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const project = makeProject({ autoRun: false });
    const tsProject: PlaygroundProject = {
      ...project,
      source: {
        ...project.source,
        script: "const a: number = 1;",
        scriptLanguage: "typescript",
      },
    };
    const { container } = render(
      <PreviewFrame project={tsProject} onMessage={onMessage} ref={ref} />,
    );

    await runAndFlush(ref);

    expect(buildDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({ script: "const a = 1;" }),
      "execution-1",
      [],
    );

    const iframe = container.querySelector("iframe");
    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeReadyMessage("execution-1"),
        source: iframe?.contentWindow,
      }),
    );
    expect(onMessage).toHaveBeenCalledExactlyOnceWith(
      makeReadyMessage("execution-1"),
      expect.objectContaining({ scriptLineMap: lineMap }),
    );
  });

  it("discards a script compile result that has gone stale by the time it resolves, without building a document", async () => {
    const ref = createRef<PreviewRunHandle>();
    render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );

    await act(async () => {
      ref.current?.runNow();
      staleExecutionId = "execution-1";
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(buildDocumentMock).not.toHaveBeenCalled();
  });

  it("disposes the TS compiler client on unmount, once it has been created", async () => {
    const ref = createRef<PreviewRunHandle>();
    const { unmount } = render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);
    unmount();

    expect(tsDisposeMock).toHaveBeenCalledTimes(1);
  });
});

describe("PreviewFrame resource loading gate", () => {
  // jsdom fires a real "load" event as soon as an iframe with no src/srcdoc
  // is connected to the document (default about:blank navigation), and it
  // does so synchronously enough within runAndFlush's act() that it beats
  // any test code back to the microtask queue. That makes it impossible to
  // test "resources-ready before load" ordering against jsdom's own timing.
  // Instead, intercept addEventListener so PreviewFrame's "load" listener is
  // captured here rather than registered on the real element -- jsdom's
  // internal navigation-triggered dispatch then finds no listener to call,
  // and tests fire the captured listener directly via fireLoad() whenever
  // they choose.
  let originalAddEventListener: typeof HTMLIFrameElement.prototype.addEventListener;
  let loadListeners: WeakMap<HTMLIFrameElement, EventListener>;

  function fireLoad(iframe: HTMLIFrameElement | null | undefined) {
    if (!iframe) return;
    loadListeners.get(iframe)?.(new Event("load"));
  }

  beforeEach(() => {
    loadListeners = new WeakMap();
    originalAddEventListener = HTMLIFrameElement.prototype.addEventListener;
    HTMLIFrameElement.prototype.addEventListener = function (
      this: HTMLIFrameElement,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === "load" && typeof listener === "function") {
        loadListeners.set(this, listener);
        return;
      }
      if (listener !== null) {
        originalAddEventListener.call(this, type, listener, options);
      }
    } as typeof HTMLIFrameElement.prototype.addEventListener;
  });

  afterEach(() => {
    HTMLIFrameElement.prototype.addEventListener = originalAddEventListener;
  });

  it("does not promote the candidate until both native load and resources-ready have arrived (load first)", async () => {
    const ref = createRef<PreviewRunHandle>();
    const { container } = render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);
    const iframe = container.querySelector("iframe");
    expect(iframe?.style.visibility).toBe("hidden");

    fireLoad(iframe);
    expect(iframe?.style.visibility).toBe("hidden");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeResourcesReadyMessage("execution-1"),
        source: iframe?.contentWindow,
      }),
    );
    expect(iframe?.style.visibility).toBe("visible");
  });

  it("does not promote the candidate until both native load and resources-ready have arrived (resources-ready first)", async () => {
    const ref = createRef<PreviewRunHandle>();
    const { container } = render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);
    const iframe = container.querySelector("iframe");
    expect(iframe?.style.visibility).toBe("hidden");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeResourcesReadyMessage("execution-1"),
        source: iframe?.contentWindow,
      }),
    );
    expect(iframe?.style.visibility).toBe("hidden");

    fireLoad(iframe);
    expect(iframe?.style.visibility).toBe("visible");
  });

  it("promotes a candidate with zero enabled resources as soon as load and resources-ready both fire", async () => {
    const ref = createRef<PreviewRunHandle>();
    const { container } = render(
      <PreviewFrame project={makeProject({ autoRun: false })} ref={ref} />,
    );

    await runAndFlush(ref);
    const iframe = container.querySelector("iframe");
    fireLoad(iframe);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeResourcesReadyMessage("execution-1"),
        source: iframe?.contentWindow,
      }),
    );

    expect(iframe?.style.visibility).toBe("visible");
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("rejects a pending candidate on a fatal (script) resource-error, keeps the previously-promoted iframe visible, and reports via onResourceLoadError instead of onMessage", async () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const onResourceLoadError = vi.fn();
    const project: PlaygroundProject = {
      ...makeProject({ autoRun: false }),
      resources: [makeResource({ url: "https://example.com/a.js" })],
    };
    const { container } = render(
      <PreviewFrame
        project={project}
        onMessage={onMessage}
        onResourceLoadError={onResourceLoadError}
        ref={ref}
      />,
    );

    // Promote the first build so there's a previously-visible iframe to protect.
    await runAndFlush(ref);
    const firstIframe = container.querySelector("iframe");
    fireLoad(firstIframe);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeResourcesReadyMessage("execution-1"),
        source: firstIframe?.contentWindow,
      }),
    );
    expect(firstIframe?.style.visibility).toBe("visible");

    // Start a second build; its candidate fails a fatal script resource.
    await runAndFlush(ref);
    const iframes = container.querySelectorAll("iframe");
    expect(iframes).toHaveLength(2);
    const secondIframe = iframes[1];

    onMessage.mockClear();
    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeResourceErrorMessage("execution-2", {
          url: "https://example.com/a.js",
          message: "Failed to load resource.",
        }),
        source: secondIframe.contentWindow,
      }),
    );

    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(container.querySelector("iframe")).toBe(firstIframe);
    expect(firstIframe?.style.visibility).toBe("visible");
    expect(onResourceLoadError).toHaveBeenCalledExactlyOnceWith(
      {
        url: "https://example.com/a.js",
        message: "Failed to load resource.",
        timestampMs: 0,
      },
      "execution-2",
    );
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("does not reject a pending candidate on a non-fatal (stylesheet) resource-error, and still forwards it via onMessage", async () => {
    const ref = createRef<PreviewRunHandle>();
    const onMessage = vi.fn();
    const onResourceLoadError = vi.fn();
    const project: PlaygroundProject = {
      ...makeProject({ autoRun: false }),
      resources: [
        makeResource({
          id: "resource-2",
          url: "https://example.com/a.css",
          type: "stylesheet",
        }),
      ],
    };
    const { container } = render(
      <PreviewFrame
        project={project}
        onMessage={onMessage}
        onResourceLoadError={onResourceLoadError}
        ref={ref}
      />,
    );

    await runAndFlush(ref);
    const iframe = container.querySelector("iframe");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeResourceErrorMessage("execution-1", {
          url: "https://example.com/a.css",
          message: "Failed to load stylesheet.",
        }),
        source: iframe?.contentWindow,
      }),
    );

    expect(onResourceLoadError).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: "resource-error" }),
      expect.anything(),
    );

    // The candidate is still promotable after a non-fatal error.
    fireLoad(iframe);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: makeResourcesReadyMessage("execution-1"),
        source: iframe?.contentWindow,
      }),
    );
    expect(iframe?.style.visibility).toBe("visible");
  });
});
