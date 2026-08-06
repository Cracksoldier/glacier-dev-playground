import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ProjectStoreProvider,
  useProjectStore,
} from "../../store/ProjectStoreContext";
import NewProjectDialog from "./NewProjectDialog";

function ActiveProjectTitle() {
  const { activeProject } = useProjectStore();
  return <p data-testid="active-title">{activeProject.title}</p>;
}

function renderDialog(isOpen = true) {
  return render(
    <ProjectStoreProvider>
      <ActiveProjectTitle />
      <NewProjectDialog isOpen={isOpen} onClose={() => {}} />
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

describe("NewProjectDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a title input and the template picker when open", () => {
    renderDialog(true);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Empty Project" }),
    ).toBeInTheDocument();
  });

  it("creates a project with the entered title and selected template", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.type(screen.getByLabelText("Title"), "My New Project");
    await user.click(screen.getByRole("radio", { name: "Empty Project" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByTestId("active-title")).toHaveTextContent(
      "My New Project",
    );
  });

  it("falls back to the template's default title when left blank", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.click(screen.getByRole("radio", { name: "Empty Project" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByTestId("active-title")).toHaveTextContent(
      "Empty Project",
    );
  });
});
