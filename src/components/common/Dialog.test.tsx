import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dialog from "./Dialog";

function renderDialog(isOpen: boolean, onClose: () => void) {
  return render(
    <Dialog isOpen={isOpen} onClose={onClose} titleId="test-dialog-title">
      <h2 id="test-dialog-title">Dialog title</h2>
      <button type="button">First</button>
      <button type="button">Last</button>
    </Dialog>,
  );
}

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

describe("Dialog", () => {
  it("renders nothing when closed", () => {
    renderDialog(false, vi.fn());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders into #dialog-root with the correct ARIA attributes when open", () => {
    renderDialog(true, vi.fn());

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "test-dialog-title");
    expect(document.getElementById("dialog-root")).toContainElement(dialog);
  });

  it("focuses the first focusable element on open", () => {
    renderDialog(true, vi.fn());

    expect(screen.getByText("First")).toHaveFocus();
  });

  it("calls onClose on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog(true, onClose);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on backdrop click", () => {
    const onClose = vi.fn();
    renderDialog(true, onClose);

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside the dialog", () => {
    const onClose = vi.fn();
    renderDialog(true, onClose);

    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("traps Tab focus within the dialog", async () => {
    const user = userEvent.setup();
    renderDialog(true, vi.fn());

    const first = screen.getByText("First");
    const last = screen.getByText("Last");

    last.focus();
    await user.tab();

    expect(first).toHaveFocus();

    await user.tab({ shift: true });

    expect(last).toHaveFocus();
  });

  it("restores focus to the previously focused element on close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Dialog isOpen={true} onClose={vi.fn()} titleId="test-dialog-title">
        <h2 id="test-dialog-title">Dialog title</h2>
        <button type="button">Inside</button>
      </Dialog>,
    );

    rerender(
      <Dialog isOpen={false} onClose={vi.fn()} titleId="test-dialog-title">
        <h2 id="test-dialog-title">Dialog title</h2>
        <button type="button">Inside</button>
      </Dialog>,
    );

    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
