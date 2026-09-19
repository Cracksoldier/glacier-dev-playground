import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ResourcePresetsSection from "./ResourcePresetsSection";

describe("ResourcePresetsSection", () => {
  it("disables the apply button until a preset is selected", () => {
    render(<ResourcePresetsSection onApply={() => {}} />);

    expect(screen.getByRole("button", { name: "Add selected" })).toBeDisabled();
  });

  it("calls onApply with the selected preset ids and clears the selection", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<ResourcePresetsSection onApply={onApply} />);

    await user.click(screen.getByRole("checkbox", { name: /Bootstrap/ }));
    await user.click(screen.getByRole("checkbox", { name: /Lodash/ }));
    const applyButton = screen.getByRole("button", { name: "Add selected" });
    expect(applyButton).toBeEnabled();

    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining(["bootstrap", "lodash"]),
    );
    expect(applyButton).toBeDisabled();
  });
});
