import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectStoreProvider } from "../../store/ProjectStoreContext";
import ResourceManagerDialog from "./ResourceManagerDialog";

function renderDialog(isOpen = true) {
  return render(
    <ProjectStoreProvider>
      <ResourceManagerDialog isOpen={isOpen} onClose={() => {}} />
    </ProjectStoreProvider>,
  );
}

async function addResource(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  url: string,
) {
  await user.click(screen.getByRole("button", { name: "Add resource" }));
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("URL"), url);
  const form = screen.getByLabelText("Name").closest("form");
  if (!form) throw new Error("form not found");
  await user.click(within(form).getByRole("button", { name: "Add resource" }));
}

beforeEach(() => {
  const root = document.createElement("div");
  root.id = "dialog-root";
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById("dialog-root")?.remove();
});

describe("ResourceManagerDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the presets section, empty list, and advanced head-content field when open", () => {
    renderDialog(true);

    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Presets")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Additional <head> markup"),
    ).toBeInTheDocument();
  });

  it("warns that external scripts can read everything on the page", () => {
    renderDialog(true);

    expect(
      screen.getByText(/External scripts run with full access/),
    ).toBeInTheDocument();
  });

  it("adds a resource and displays it in the list", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await addResource(user, "My Script", "https://example.com/script.js");

    expect(screen.getByText("My Script")).toBeInTheDocument();
    expect(
      screen.getByText("https://example.com/script.js"),
    ).toBeInTheDocument();
  });

  it("toggles a resource's enabled state", async () => {
    const user = userEvent.setup();
    renderDialog(true);
    await addResource(user, "My Script", "https://example.com/script.js");

    const checkbox = screen.getByLabelText("Disable My Script");
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(screen.getByLabelText("Enable My Script")).not.toBeChecked();
  });

  it("edits a resource via the inline form", async () => {
    const user = userEvent.setup();
    renderDialog(true);
    await addResource(user, "My Script", "https://example.com/script.js");

    await user.click(screen.getByRole("button", { name: "Edit My Script" }));
    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed Script");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Renamed Script")).toBeInTheDocument();
    expect(screen.queryByText("My Script")).not.toBeInTheDocument();
  });

  it("deletes a resource after confirmation", async () => {
    const user = userEvent.setup();
    renderDialog(true);
    await addResource(user, "My Script", "https://example.com/script.js");

    await user.click(screen.getByRole("button", { name: "Delete My Script" }));
    expect(screen.getByText(/Delete "My Script"/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.queryByText("My Script")).not.toBeInTheDocument();
  });

  it("cancels resource deletion when the confirmation is dismissed", async () => {
    const user = userEvent.setup();
    renderDialog(true);
    await addResource(user, "My Script", "https://example.com/script.js");

    await user.click(screen.getByRole("button", { name: "Delete My Script" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("My Script")).toBeInTheDocument();
  });

  it("reorders resources of the same type with move up/down", async () => {
    const user = userEvent.setup();
    renderDialog(true);
    await addResource(user, "Script A", "https://example.com/a.js");
    await addResource(user, "Script B", "https://example.com/b.js");

    const namesBefore = screen
      .getAllByText(/^Script (A|B)$/)
      .map((el) => el.textContent);
    expect(namesBefore).toEqual(["Script A", "Script B"]);

    await user.click(screen.getByRole("button", { name: "Move Script B up" }));

    const namesAfter = screen
      .getAllByText(/^Script (A|B)$/)
      .map((el) => el.textContent);
    expect(namesAfter).toEqual(["Script B", "Script A"]);
  });

  it("applies a preset and adds its resources to the list", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.click(screen.getByRole("checkbox", { name: /Lodash/ }));
    await user.click(screen.getByRole("button", { name: "Add selected" }));

    expect(
      screen.getByRole("button", { name: "Edit Lodash" }),
    ).toBeInTheDocument();
  });

  it("updates the project's head content from the advanced textarea", async () => {
    const user = userEvent.setup();
    renderDialog(true);

    const textarea = screen.getByLabelText("Additional <head> markup");
    await user.type(textarea, '<meta name="x" content="y">');

    expect(textarea).toHaveValue('<meta name="x" content="y">');
  });
});
