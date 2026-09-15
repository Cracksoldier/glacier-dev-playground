import { render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaygroundProject } from "../../models/project";
import { PROJECT_TEMPLATES } from "../../models/templates";
import PreviewFrame, { type PreviewRunHandle } from "./PreviewFrame";

const startBuildMock = vi.fn(() => ({
  compilationId: "compilation-1",
  executionId: "execution-1",
  document: "<html></html>",
}));

vi.mock("../../preview/buildCoordinator", () => ({
  createPreviewBuildCoordinator: () => ({
    startBuild: startBuildMock,
    isStale: () => false,
  }),
}));

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
});
