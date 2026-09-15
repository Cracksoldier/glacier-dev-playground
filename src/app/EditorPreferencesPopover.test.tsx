import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_EDITOR_PREFERENCES } from "../preferences/editorPreferences";
import EditorPreferencesPopover from "./EditorPreferencesPopover";

function Harness({
  onUpdatePreferences,
}: {
  onUpdatePreferences: (
    partial: Partial<typeof DEFAULT_EDITOR_PREFERENCES>,
  ) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={anchorRef} type="button">
        Anchor
      </button>
      <EditorPreferencesPopover
        isOpen={true}
        onClose={() => {}}
        anchorRef={anchorRef}
        preferences={DEFAULT_EDITOR_PREFERENCES}
        onUpdatePreferences={onUpdatePreferences}
      />
    </div>
  );
}

describe("EditorPreferencesPopover", () => {
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
