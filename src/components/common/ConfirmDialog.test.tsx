import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

describe("ConfirmDialog", () => {
  it("renders the title, description, and button labels", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Delete project")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("focuses Cancel by default", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("supports a custom cancel label", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Reset project"
        description="Overwrites current content."
        confirmLabel="Reset"
        cancelLabel="Keep editing"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Keep editing" }),
    ).toBeInTheDocument();
  });
});
