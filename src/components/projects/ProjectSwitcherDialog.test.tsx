import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import ProjectSwitcherDialog from "./ProjectSwitcherDialog";

function ActiveProjectTitle() {
  const { activeProject } = useProjectStore();
  return <p data-testid="active-title">{activeProject.title}</p>;
}

function renderDialog(isOpen = true, onClose: () => void = () => {}) {
  return render(
    <ProjectStoreProvider>
      <ActiveProjectTitle />
      <ProjectSwitcherDialog isOpen={isOpen} onClose={onClose} />
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

describe("ProjectSwitcherDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog(false);

    expect(
      screen.queryByRole("dialog", { name: "Projects" }),
    ).not.toBeInTheDocument();
  });

  it("renders as a modal dialog titled Projects", () => {
    renderDialog(true);

    expect(screen.getByRole("dialog", { name: "Projects" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
  });

  it("closes from the Close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(true, onClose);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes after switching to another project", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(true, onClose);

    await user.click(
      screen.getByRole("button", { name: "Basic HTML Example" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("lists the active project marked as current", () => {
    renderDialog(true);

    const activeTitle = screen.getByTestId("active-title").textContent;
    expect(activeTitle).toBeTruthy();
    const switchButton = screen.getByRole("button", {
      name: activeTitle ?? "",
    });
    expect(switchButton).toHaveAttribute("aria-current", "true");
  });

  it("switches the active project when a row is clicked", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.click(
      screen.getByRole("button", { name: "Duplicate Basic HTML Example" }),
    );
    expect(screen.getByTestId("active-title")).toHaveTextContent(
      "Basic HTML Example Copy",
    );

    await user.click(
      screen.getByRole("button", { name: "Basic HTML Example" }),
    );

    expect(screen.getByTestId("active-title")).toHaveTextContent(
      "Basic HTML Example",
    );
  });

  it("duplicates a project", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.click(
      screen.getByRole("button", { name: "Duplicate Basic HTML Example" }),
    );

    expect(
      screen.getByRole("button", { name: "Basic HTML Example Copy" }),
    ).toBeInTheDocument();
  });

  it("renames a project via the inline field", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.click(
      screen.getByRole("button", { name: "Rename Basic HTML Example" }),
    );

    const input = screen.getByLabelText("New title for Basic HTML Example");
    await user.clear(input);
    await user.type(input, "Renamed Project{Enter}");

    expect(screen.getByTestId("active-title")).toHaveTextContent(
      "Renamed Project",
    );
  });

  it("reverts an inline rename on Escape without closing the dialog", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(true, onClose);

    await user.click(
      screen.getByRole("button", { name: "Rename Basic HTML Example" }),
    );

    const input = screen.getByLabelText("New title for Basic HTML Example");
    await user.clear(input);
    await user.type(input, "Should not be saved{Escape}");

    expect(
      screen.getByRole("button", { name: "Basic HTML Example" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("deletes a project after confirming", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.click(
      screen.getByRole("button", { name: "Duplicate Basic HTML Example" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete Basic HTML Example Copy" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.queryByRole("button", { name: "Basic HTML Example Copy" }),
    ).not.toBeInTheDocument();
    // The deleted row's Delete button is gone, so focus must stay inside the
    // switcher rather than falling back to the document body.
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });
});
