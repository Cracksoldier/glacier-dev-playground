import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClipboardFallbackDialog from "./ClipboardFallbackDialog";

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

describe("ClipboardFallbackDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ClipboardFallbackDialog
        isOpen={false}
        onClose={vi.fn()}
        html="<p>hi</p>"
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the HTML in a read-only, auto-selected textarea", () => {
    render(
      <ClipboardFallbackDialog isOpen onClose={vi.fn()} html="<p>hi</p>" />,
    );

    const textarea =
      screen.getByLabelText<HTMLTextAreaElement>("Standalone HTML");
    expect(textarea.value).toBe("<p>hi</p>");
    expect(textarea).toHaveAttribute("readonly");
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ClipboardFallbackDialog isOpen onClose={onClose} html="<p>hi</p>" />,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
