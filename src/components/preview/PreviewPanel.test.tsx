import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import type { PreviewRunHandle } from "./PreviewFrame";
import PreviewPanel from "./PreviewPanel";

// jsdom has no Worker; PreviewFrame's build pipeline now unconditionally runs
// a TS/JS compile (unlike SCSS, which only creates its worker for scss
// sources), so this always-real-PreviewFrame test suite must stub it out.
vi.mock("../../preview/tsCompilerClient", () => ({
  createTsCompilerClient: () => ({
    compile: async (source: string) => ({
      diagnostics: [],
      emittedJs: source,
      lineMap: null,
    }),
    dispose: () => {},
  }),
}));

function createConsoleEntriesStub(): UseConsoleEntriesResult {
  return {
    entries: [],
    startRun: vi.fn(),
    clear: vi.fn(),
    append: vi.fn(),
  };
}

function renderPreviewPanel() {
  return render(
    <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
      <PreviewPanel
        consoleEntries={createConsoleEntriesStub()}
        presentation="default"
        onPresentationChange={vi.fn()}
      />
    </ProjectStoreProvider>,
  );
}

function AddRelativeImageOnMount() {
  const { activeProject, actions } = useProjectStore();
  const { id: activeProjectId } = activeProject;
  const { updateProjectSource } = actions;
  useEffect(() => {
    updateProjectSource(activeProjectId, {
      html: '<img src="images/a.png">',
    });
  }, [activeProjectId, updateProjectSource]);
  return null;
}

function MakeUntrustedWithScriptResourceOnMount() {
  const { activeProject, actions } = useProjectStore();
  const { id: activeProjectId } = activeProject;
  const { updateProjectResources, setProjectTrusted } = actions;
  useEffect(() => {
    updateProjectResources(activeProjectId, [
      {
        id: "resource-1",
        name: "Example script",
        url: "https://example.com/a.js",
        type: "script",
        enabled: true,
        order: 0,
      },
    ]);
    setProjectTrusted(activeProjectId, false);
  }, [activeProjectId, updateProjectResources, setProjectTrusted]);
  return null;
}

describe("PreviewPanel", () => {
  it("renders the Preview section with a header", () => {
    renderPreviewPanel();
    expect(screen.getByRole("region", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("does not show the relative-URL warning for the default starter project", () => {
    renderPreviewPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the relative-URL warning once the source contains a relative asset URL", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
          <AddRelativeImageOnMount />
          <PreviewPanel
            consoleEntries={createConsoleEntriesStub()}
            presentation="default"
            onPresentationChange={vi.fn()}
          />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Relative asset URLs aren't portable",
    );
  });

  it("renders a preview iframe", async () => {
    const { container } = renderPreviewPanel();
    await waitFor(() =>
      expect(container.querySelector("iframe")).toBeInTheDocument(),
    );
  });

  it("does not show the SCSS-stale banner by default", () => {
    renderPreviewPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the SCSS-stale banner when isScssStale is true", () => {
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <PreviewPanel
          consoleEntries={createConsoleEntriesStub()}
          presentation="default"
          onPresentationChange={vi.fn()}
          isScssStale
        />
      </ProjectStoreProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("SCSS compile failed");
  });

  it("does not show the script-stale banner by default", () => {
    renderPreviewPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the script-stale banner when isScriptStale is true, naming the active script language", () => {
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <PreviewPanel
          consoleEntries={createConsoleEntriesStub()}
          presentation="default"
          onPresentationChange={vi.fn()}
          isScriptStale
        />
      </ProjectStoreProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "JavaScript compile failed",
    );
  });

  it("does not show the trust banner for a trusted project", () => {
    renderPreviewPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the trust banner and a Trust and run button for an untrusted project with an enabled script resource", async () => {
    await act(async () => {
      render(
        <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
          <MakeUntrustedWithScriptResourceOnMount />
          <PreviewPanel
            consoleEntries={createConsoleEntriesStub()}
            presentation="default"
            onPresentationChange={vi.fn()}
          />
        </ProjectStoreProvider>,
      );
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "hasn't been trusted yet",
    );
    expect(
      screen.getByRole("button", { name: "Trust and run" }),
    ).toBeInTheDocument();
  });

  it("clicking Trust and run trusts the project, dismisses the banner, and starts a new build", async () => {
    const userEvent = await import("@testing-library/user-event");
    const user = userEvent.default.setup();
    const ref = createRef<PreviewRunHandle>();

    const { container } = await act(async () =>
      render(
        <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
          <MakeUntrustedWithScriptResourceOnMount />
          <PreviewPanel
            consoleEntries={createConsoleEntriesStub()}
            presentation="default"
            onPresentationChange={vi.fn()}
            ref={ref}
          />
        </ProjectStoreProvider>,
      ),
    );

    const iframeCountBeforeClick = container.querySelectorAll("iframe").length;

    await user.click(screen.getByRole("button", { name: "Trust and run" }));

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
    await waitFor(() =>
      expect(container.querySelectorAll("iframe").length).toBeGreaterThan(
        iframeCountBeforeClick,
      ),
    );
  });

  it("reflects the current presentation on the toggle buttons", () => {
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <PreviewPanel
          consoleEntries={createConsoleEntriesStub()}
          presentation="expanded"
          onPresentationChange={vi.fn()}
        />
      </ProjectStoreProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Expand preview" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Full-window preview" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles expanded on and back off", async () => {
    const userEvent = await import("@testing-library/user-event");
    const user = userEvent.default.setup();
    const onPresentationChange = vi.fn();
    const { rerender } = render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <PreviewPanel
          consoleEntries={createConsoleEntriesStub()}
          presentation="default"
          onPresentationChange={onPresentationChange}
        />
      </ProjectStoreProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Expand preview" }));
    expect(onPresentationChange).toHaveBeenCalledWith("expanded");

    rerender(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <PreviewPanel
          consoleEntries={createConsoleEntriesStub()}
          presentation="expanded"
          onPresentationChange={onPresentationChange}
        />
      </ProjectStoreProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Expand preview" }));
    expect(onPresentationChange).toHaveBeenLastCalledWith("default");
  });

  it("leaves full-window presentation on Escape", async () => {
    const userEvent = await import("@testing-library/user-event");
    const user = userEvent.default.setup();
    const onPresentationChange = vi.fn();
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <PreviewPanel
          consoleEntries={createConsoleEntriesStub()}
          presentation="full-window"
          onPresentationChange={onPresentationChange}
        />
      </ProjectStoreProvider>,
    );

    await user.keyboard("{Escape}");

    expect(onPresentationChange).toHaveBeenCalledWith("default");
  });

  it("ignores Escape when not in full-window presentation", async () => {
    const userEvent = await import("@testing-library/user-event");
    const user = userEvent.default.setup();
    const onPresentationChange = vi.fn();
    render(
      <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
        <PreviewPanel
          consoleEntries={createConsoleEntriesStub()}
          presentation="expanded"
          onPresentationChange={onPresentationChange}
        />
      </ProjectStoreProvider>,
    );

    await user.keyboard("{Escape}");

    expect(onPresentationChange).not.toHaveBeenCalled();
  });
});
