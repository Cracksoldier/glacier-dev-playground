import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EDITOR_PREFERENCES } from "../preferences/editorPreferences";
import EditorPreferencesDialog from "./EditorPreferencesDialog";

function Harness({
  onUpdatePreferences = () => {},
  onClose = () => {},
}: {
  onUpdatePreferences?: (
    partial: Partial<typeof DEFAULT_EDITOR_PREFERENCES>,
  ) => void;
  onClose?: () => void;
}) {
  return (
    <EditorPreferencesDialog
      isOpen={true}
      onClose={onClose}
      preferences={DEFAULT_EDITOR_PREFERENCES}
      onUpdatePreferences={onUpdatePreferences}
    />
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

describe("EditorPreferencesDialog", () => {
  it("renders as a modal dialog titled Editor preferences", () => {
    render(<Harness />);

    expect(
      screen.getByRole("dialog", { name: "Editor preferences" }),
    ).toHaveAttribute("aria-modal", "true");
  });

  it("closes from the Close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("increases font size on the increase button", async () => {
    const user = userEvent.setup();
    const onUpdatePreferences = vi.fn();
    render(<Harness onUpdatePreferences={onUpdatePreferences} />);

    await user.click(
      screen.getByRole("button", { name: "Increase font size" }),
    );

    expect(onUpdatePreferences).toHaveBeenCalledWith({ fontSize: 15 });
  });

  it("decreases font size on the decrease button", async () => {
    const user = userEvent.setup();
    const onUpdatePreferences = vi.fn();
    render(<Harness onUpdatePreferences={onUpdatePreferences} />);

    await user.click(
      screen.getByRole("button", { name: "Decrease font size" }),
    );

    expect(onUpdatePreferences).toHaveBeenCalledWith({ fontSize: 13 });
  });

  it("changes tab width via the select", async () => {
    const user = userEvent.setup();
    const onUpdatePreferences = vi.fn();
    render(<Harness onUpdatePreferences={onUpdatePreferences} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tab width" }),
      "4",
    );

    expect(onUpdatePreferences).toHaveBeenCalledWith({ tabWidth: 4 });
  });

  it("toggles word wrap", async () => {
    const user = userEvent.setup();
    const onUpdatePreferences = vi.fn();
    render(<Harness onUpdatePreferences={onUpdatePreferences} />);

    await user.click(screen.getByRole("checkbox", { name: "Word wrap" }));

    expect(onUpdatePreferences).toHaveBeenCalledWith({ wordWrap: true });
  });

  it("toggles line numbers", async () => {
    const user = userEvent.setup();
    const onUpdatePreferences = vi.fn();
    render(<Harness onUpdatePreferences={onUpdatePreferences} />);

    await user.click(screen.getByRole("checkbox", { name: "Line numbers" }));

    expect(onUpdatePreferences).toHaveBeenCalledWith({ lineNumbers: false });
  });
});
