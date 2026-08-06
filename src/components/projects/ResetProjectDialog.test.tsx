import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import ResetProjectDialog from "./ResetProjectDialog";

function Harness({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { activeProject } = useProjectStore();
  return (
    <ResetProjectDialog
      isOpen={isOpen}
      projectId={activeProject.id}
      onClose={onClose}
    />
  );
}

function renderDialog(isOpen: boolean, onClose: () => void) {
  return render(
    <ProjectStoreProvider>
      <Harness isOpen={isOpen} onClose={onClose} />
    </ProjectStoreProvider>,
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

describe("ResetProjectDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog(false, vi.fn());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the template picker first", () => {
    renderDialog(true, vi.fn());

    expect(
      screen.getByRole("radio", { name: "Empty Project" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
  });

  it("advances to a confirmation step naming the chosen template", async () => {
    const user = userEvent.setup();
    renderDialog(true, vi.fn());

    await user.click(screen.getByRole("radio", { name: "Empty Project" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText(/Empty Project/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("calls onClose when cancelling the template step", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog(true, onClose);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resets the project from the chosen template on confirm", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog(true, onClose);

    await user.click(screen.getByRole("radio", { name: "Empty Project" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
