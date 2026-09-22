import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KeyboardHelpDialog from "./KeyboardHelpDialog";

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

describe("KeyboardHelpDialog", () => {
  it("renders nothing when closed", () => {
    render(<KeyboardHelpDialog isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists the documented shortcuts when open", () => {
    render(<KeyboardHelpDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Run the preview")).toBeInTheDocument();
    expect(screen.getByText("Save the project")).toBeInTheDocument();
    expect(screen.getByText("Focus the preview")).toBeInTheDocument();
  });

  it("calls onClose when the Close button is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardHelpDialog isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
