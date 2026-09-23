import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type RefObject, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import Popover from "./Popover";

function Harness({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button type="button" ref={anchorRef}>
        Trigger
      </button>
      <button type="button">Outside</button>
      <Popover
        isOpen={isOpen}
        onClose={onClose}
        anchorRef={anchorRef as RefObject<HTMLElement | null>}
        aria-label="Test popover"
      >
        <button type="button">First</button>
        <button type="button">Inside popover</button>
      </Popover>
    </div>
  );
}

describe("Popover", () => {
  it("renders nothing when closed", () => {
    render(<Harness isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("renders content when open", () => {
    render(<Harness isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getByText("Inside popover")).toBeInTheDocument();
  });

  it("closes on outside click", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText("Outside"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on click inside the popover", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText("Inside popover"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on click on the anchor", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness isOpen={true} onClose={onClose} />);

    await user.click(screen.getByText("Trigger"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes and returns focus to the anchor on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness isOpen={true} onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Trigger")).toHaveFocus();
  });

  it("auto-focuses the first focusable element when opened", () => {
    render(<Harness isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("First")).toHaveFocus();
  });

  it("traps Tab focus within the popover", async () => {
    const user = userEvent.setup();
    render(<Harness isOpen={true} onClose={vi.fn()} />);

    const first = screen.getByText("First");
    const last = screen.getByText("Inside popover");
    expect(first).toHaveFocus();

    last.focus();
    await user.tab();
    expect(first).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it("renders a group labelled by the caller-supplied aria-label", () => {
    render(<Harness isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByRole("group", { name: "Test popover" }),
    ).toBeInTheDocument();
  });
});
