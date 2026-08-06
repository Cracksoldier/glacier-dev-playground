import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell";

const TOOLBAR_ACTION_NAMES = [
  "Switch project",
  "New project",
  "Run",
  "Auto-run",
  "Resources",
  "Import",
  "Export",
  "Reset",
  "Settings",
];

describe("AppShell", () => {
  it("exposes header and main landmarks", () => {
    render(<AppShell />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders disabled toolbar actions with accessible names and explanations", () => {
    render(<AppShell />);
    for (const name of TOOLBAR_ACTION_NAMES) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("aria-disabled", "true");
      const describedById = button.getAttribute("aria-describedby");
      expect(describedById).toBeTruthy();
      expect(
        document.getElementById(describedById as string),
      ).toHaveTextContent("Coming in a later milestone");
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
});
