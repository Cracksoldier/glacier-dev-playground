import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import ProjectSwitcherPopover from "./ProjectSwitcherPopover";

function Harness({ isOpen }: { isOpen: boolean }) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" ref={anchorRef}>
        Switch project
      </button>
      <ProjectSwitcherPopover
        isOpen={isOpen}
        onClose={() => {}}
        anchorRef={anchorRef}
      />
    </>
  );
}

function ActiveProjectTitle() {
  const { activeProject } = useProjectStore();
  return <p data-testid="active-title">{activeProject.title}</p>;
}

function renderPopover(isOpen = true) {
  return render(
    <ProjectStoreProvider>
      <ActiveProjectTitle />
      <Harness isOpen={isOpen} />
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

describe("ProjectSwitcherPopover", () => {
  it("renders nothing when closed", () => {
    renderPopover(false);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("lists the active project marked as current", () => {
    renderPopover(true);

    const activeTitle = screen.getByTestId("active-title").textContent;
    expect(activeTitle).toBeTruthy();
    const switchButton = screen.getByRole("button", {
      name: activeTitle ?? "",
    });
    expect(switchButton).toHaveAttribute("aria-current", "true");
  });

  it("switches the active project when a row is clicked", async () => {
    const user = userEvent.setup();
    renderPopover(true);

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
    renderPopover(true);

    await user.click(
      screen.getByRole("button", { name: "Duplicate Basic HTML Example" }),
    );

    expect(
      screen.getByRole("button", { name: "Basic HTML Example Copy" }),
    ).toBeInTheDocument();
  });

  it("renames a project via the inline field", async () => {
    const user = userEvent.setup();
    renderPopover(true);

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

  it("reverts an inline rename on Escape", async () => {
    const user = userEvent.setup();
    renderPopover(true);

    await user.click(
      screen.getByRole("button", { name: "Rename Basic HTML Example" }),
    );

    const input = screen.getByLabelText("New title for Basic HTML Example");
    await user.clear(input);
    await user.type(input, "Should not be saved{Escape}");

    expect(
      screen.getByRole("button", { name: "Basic HTML Example" }),
    ).toBeInTheDocument();
  });

  it("deletes a project after confirming", async () => {
    const user = userEvent.setup();
    renderPopover(true);

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
  });
});
