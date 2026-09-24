import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectSource } from "../models/project";
import type { PreviewMessage } from "../preview/previewMessage";
import type { ScssCompileError } from "../preview/scssWorkerProtocol";
import AppShell from "./AppShell";

interface PreviewFrameMockProps {
  onBuildStart?: () => void;
  onMessage?: (message: PreviewMessage, resolvedSource: ProjectSource) => void;
  onScssCompileError?: (error: ScssCompileError, compilationId: string) => void;
  onScssCompileSuccess?: (css: string, compilationId: string) => void;
}

const { previewFrameProps } = vi.hoisted(() => ({
  previewFrameProps: {
    current: null as PreviewFrameMockProps | null,
  },
}));

vi.mock("../components/preview/PreviewFrame", () => ({
  default: (props: PreviewFrameMockProps) => {
    previewFrameProps.current = props;
    return null;
  },
}));

const DISABLED_TOOLBAR_ACTION_NAMES = ["Settings"];

const ENABLED_TOOLBAR_ACTION_NAMES = [
  "Switch project",
  "New project",
  "Run",
  "Auto-run",
  "Resources",
  "Import",
  "Export",
  "Reset",
];

afterEach(() => {
  window.localStorage.clear();
});

function workspace(container: HTMLElement): HTMLElement {
  const element = container.querySelector("[data-workspace-layout]");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Expected the workspace element to be rendered");
  }
  return element;
}

function separatorOrientations() {
  return screen
    .getAllByRole("separator")
    .map((separator) => separator.getAttribute("aria-orientation"));
}

describe("AppShell", () => {
  it("exposes header and main landmarks", () => {
    render(<AppShell />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("still renders when the browser blocks access to localStorage", () => {
    const storageSpy = vi
      .spyOn(window, "localStorage", "get")
      .mockImplementation(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      });
    try {
      render(<AppShell />);
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.getAllByRole("separator").length).toBeGreaterThan(0);
    } finally {
      storageSpy.mockRestore();
    }
  });

  it("renders disabled toolbar actions with accessible names and explanations", () => {
    render(<AppShell />);
    for (const name of DISABLED_TOOLBAR_ACTION_NAMES) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("aria-disabled", "true");
      const describedById = button.getAttribute("aria-describedby");
      expect(describedById).toBeTruthy();
      expect(
        document.getElementById(describedById as string),
      ).toHaveTextContent("Coming in a later milestone");
    }
  });

  it("renders the project management toolbar actions as real controls", () => {
    render(<AppShell />);
    for (const name of ENABLED_TOOLBAR_ACTION_NAMES) {
      const button = screen.getByRole("button", { name });
      expect(button).not.toHaveAttribute("aria-disabled");
    }
  });

  it("resizes a panel pair with the keyboard", async () => {
    // jsdom has no real layout engine (offsetWidth is always 0), which leaves the
    // library's percentage-based resize math with nothing to compute against.
    // Stub a nonzero panel width so keyboard resizing has real geometry to work with.
    const widthSpy = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockReturnValue(200);
    try {
      const user = userEvent.setup();
      render(<AppShell />);

      const separators = screen.getAllByRole("separator");
      expect(separators.length).toBeGreaterThan(0);

      const [firstSeparator] = separators;
      firstSeparator.focus();
      const initialValue = firstSeparator.getAttribute("aria-valuenow");

      await user.keyboard("{ArrowRight}");

      expect(firstSeparator.getAttribute("aria-valuenow")).not.toBe(
        initialValue,
      );
    } finally {
      widthSpy.mockRestore();
    }
  });

  it("applies the dark-only Glacier color scheme", () => {
    const { container } = render(<AppShell />);
    const shell = container.firstElementChild as HTMLElement;
    expect(getComputedStyle(shell).colorScheme).toBe("dark");
  });

  it("does not offer a light-theme toggle", () => {
    render(<AppShell />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /theme/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the active project's title from the project store", () => {
    render(<AppShell />);
    expect(screen.getByText("Basic HTML Example")).toBeInTheDocument();
  });

  it("renders the three CodeMirror editors with accessible names", () => {
    render(<AppShell />);
    expect(
      screen.getByRole("textbox", { name: "HTML source" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Stylesheet source" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Script source" }),
    ).toBeInTheDocument();
  });

  it("moves focus into the HTML editor on Alt+1", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.keyboard("{Alt>}1{/Alt}");

    expect(screen.getByRole("textbox", { name: "HTML source" })).toHaveFocus();
  });

  it("moves focus into the CSS editor on Alt+2", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.keyboard("{Alt>}2{/Alt}");

    expect(
      screen.getByRole("textbox", { name: "Stylesheet source" }),
    ).toHaveFocus();
  });

  it("moves focus into the JS editor on Alt+3", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.keyboard("{Alt>}3{/Alt}");

    expect(
      screen.getByRole("textbox", { name: "Script source" }),
    ).toHaveFocus();
  });

  it("wires an SCSS compile error into the CSS editor error badge and the preview stale banner", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Stylesheet language" }),
      "scss",
    );

    act(() => {
      previewFrameProps.current?.onScssCompileError?.(
        { message: "Undefined variable.", line: 2 },
        "compilation-1",
      );
    });

    expect(screen.getByText("Contains an error")).toBeInTheDocument();
    expect(screen.getAllByText(/SCSS compile failed/).length).toBeGreaterThan(
      0,
    );
  });

  it("clears the SCSS-stale state once a subsequent compile succeeds", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Stylesheet language" }),
      "scss",
    );

    act(() => {
      previewFrameProps.current?.onScssCompileError?.(
        { message: "Undefined variable." },
        "compilation-1",
      );
    });
    expect(screen.getAllByText(/SCSS compile failed/).length).toBeGreaterThan(
      0,
    );

    act(() => {
      previewFrameProps.current?.onScssCompileSuccess?.(
        ".a { color: red; }",
        "compilation-2",
      );
    });

    expect(screen.queryByText(/SCSS compile failed/)).not.toBeInTheDocument();
  });

  it("uses the default layout: editors in a row above the preview", () => {
    const { container } = render(<AppShell />);

    expect(workspace(container)).toHaveAttribute(
      "data-workspace-layout",
      "default",
    );
    expect(
      screen.getByRole("button", { name: "Default layout" }),
    ).toHaveAttribute("aria-pressed", "true");
    // Two vertical lines between the editor columns, then one horizontal
    // line between the editors and the preview below them.
    expect(separatorOrientations()).toEqual([
      "vertical",
      "vertical",
      "horizontal",
    ]);
  });

  it("switches to the side layout, stacking the editors beside the preview", async () => {
    const user = userEvent.setup();
    const { container } = render(<AppShell />);

    await user.click(screen.getByRole("button", { name: "Side layout" }));

    expect(workspace(container)).toHaveAttribute(
      "data-workspace-layout",
      "side",
    );
    expect(screen.getByRole("button", { name: "Side layout" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(separatorOrientations()).toEqual([
      "horizontal",
      "horizontal",
      "vertical",
    ]);
  });

  it("keeps the editors mounted when switching to preview only", async () => {
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const htmlEditor = screen.getByRole("textbox", { name: "HTML source" });

    await user.click(screen.getByRole("button", { name: "Preview only" }));

    expect(workspace(container)).toHaveAttribute(
      "data-workspace-layout",
      "preview",
    );
    // Same element, not a remount: editor state (undo history, cursor)
    // survives the round trip.
    expect(htmlEditor).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Default layout" }));
    expect(screen.getByRole("textbox", { name: "HTML source" })).toBe(
      htmlEditor,
    );
  });

  it("restores the persisted workspace layout on remount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AppShell />);
    await user.click(screen.getByRole("button", { name: "Side layout" }));
    unmount();

    const { container } = render(<AppShell />);

    expect(workspace(container)).toHaveAttribute(
      "data-workspace-layout",
      "side",
    );
  });

  it("leaves preview only and focuses the HTML editor on Alt+1", async () => {
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(screen.getByRole("button", { name: "Side layout" }));
    await user.click(screen.getByRole("button", { name: "Preview only" }));

    await user.keyboard("{Alt>}1{/Alt}");

    // Back to the last editing layout, not just the default one.
    expect(workspace(container)).toHaveAttribute(
      "data-workspace-layout",
      "side",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "HTML source" }),
      ).toHaveFocus(),
    );
  });
});
