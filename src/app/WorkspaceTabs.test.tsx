import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WorkspaceTabs from "./WorkspaceTabs";

describe("WorkspaceTabs", () => {
  it("renders 5 tabs with the active one selected", () => {
    render(<WorkspaceTabs activeTab="css" onSelect={vi.fn()} />);

    const tabs = screen.getAllByRole("tab", { hidden: true });
    expect(tabs).toHaveLength(5);

    const cssTab = screen.getByRole("tab", { name: "CSS/SCSS", hidden: true });
    expect(cssTab).toHaveAttribute("aria-selected", "true");
    expect(cssTab).toHaveAttribute("tabIndex", "0");

    const htmlTab = screen.getByRole("tab", { name: "HTML", hidden: true });
    expect(htmlTab).toHaveAttribute("aria-selected", "false");
    expect(htmlTab).toHaveAttribute("tabIndex", "-1");
  });

  it("calls onSelect when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WorkspaceTabs activeTab="html" onSelect={onSelect} />);

    await user.click(
      screen.getByRole("tab", { name: "Preview", hidden: true }),
    );

    expect(onSelect).toHaveBeenCalledWith("preview");
  });

  it("moves selection to the next tab on ArrowRight", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WorkspaceTabs activeTab="html" onSelect={onSelect} />);

    screen.getByRole("tab", { name: "HTML", hidden: true }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onSelect).toHaveBeenCalledWith("css");
  });

  it("moves selection to the previous tab on ArrowLeft, wrapping around", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WorkspaceTabs activeTab="html" onSelect={onSelect} />);

    screen.getByRole("tab", { name: "HTML", hidden: true }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(onSelect).toHaveBeenCalledWith("console");
  });

  it("has an accessible name for the tablist", () => {
    render(<WorkspaceTabs activeTab="html" onSelect={vi.fn()} />);

    expect(screen.getByRole("tablist", { hidden: true })).toHaveAttribute(
      "aria-label",
      "Workspace panels",
    );
  });
});
