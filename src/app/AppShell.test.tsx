import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell";

const DISABLED_TOOLBAR_ACTION_NAMES = [
  "Resources",
  "Import",
  "Export",
  "Settings",
];

const ENABLED_TOOLBAR_ACTION_NAMES = [
  "Switch project",
  "New project",
  "Run",
  "Auto-run",
  "Reset",
];

describe("AppShell", () => {
  it("exposes header and main landmarks", () => {
    render(<AppShell />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
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
});
