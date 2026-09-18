import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleEntry } from "../../app/useConsoleEntries";
import type { MappedSourceLocation } from "../../preview/mapErrorToSource";
import { ProjectStoreProvider } from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import ConsolePanel from "./ConsolePanel";

function renderConsolePanel(
  entries: ConsoleEntry[] = [],
  overrides: {
    onClear?: () => void;
    onFocusSource?: (location: MappedSourceLocation) => void;
  } = {},
) {
  const onClear = overrides.onClear ?? vi.fn();
  const onFocusSource = overrides.onFocusSource ?? vi.fn();
  render(
    <ProjectStoreProvider repository={createInMemoryProjectRepository()}>
      <ConsolePanel
        entries={entries}
        onClear={onClear}
        onFocusSource={onFocusSource}
      />
    </ProjectStoreProvider>,
  );
  return { onClear, onFocusSource };
}

function makeEntry(overrides: Partial<ConsoleEntry> = {}): ConsoleEntry {
  return {
    id: "entry-1",
    type: "console",
    level: "log",
    timestampMs: 1000,
    relativeMs: 500,
    args: [{ kind: "primitive", value: "hello" }],
    ...overrides,
  };
}

describe("ConsolePanel", () => {
  it("renders the Console toggle, expanded by default", () => {
    renderConsolePanel();
    expect(screen.getByRole("button", { name: /Console/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("collapses and expands on toggle click", async () => {
    const user = userEvent.setup();
    renderConsolePanel();
    const toggle = screen.getByRole("button", { name: /Console/ });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("shows no error badge when there are no runtime-error entries", () => {
    renderConsolePanel([makeEntry()]);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("shows an error badge with the runtime-error count", () => {
    renderConsolePanel([
      makeEntry({ id: "e1", type: "runtime-error", message: "boom" }),
      makeEntry({ id: "e2", type: "runtime-error", message: "boom again" }),
      makeEntry({ id: "e3" }),
    ]);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows an empty state message when there are no entries", () => {
    renderConsolePanel([]);
    expect(screen.getByText("No console output yet.")).toBeInTheDocument();
  });

  it("calls onClear when the Clear button is clicked", async () => {
    const user = userEvent.setup();
    const { onClear } = renderConsolePanel([makeEntry()]);

    await user.click(screen.getByRole("button", { name: /Clear/ }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("reflects the project's preserveConsole setting in the checkbox", () => {
    renderConsolePanel([]);
    expect(
      screen.getByRole("checkbox", { name: "Preserve logs" }),
    ).not.toBeChecked();
  });

  it("toggles preserveConsole when the checkbox is clicked", async () => {
    const user = userEvent.setup();
    renderConsolePanel([]);
    const checkbox = screen.getByRole("checkbox", { name: "Preserve logs" });

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it("renders a console entry's relative time and args", () => {
    renderConsolePanel([
      makeEntry({ relativeMs: 250, args: [{ kind: "primitive", value: 42 }] }),
    ]);
    expect(screen.getByText("+250ms")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders a runtime-error entry's message when it has no args", () => {
    renderConsolePanel([
      makeEntry({
        type: "runtime-error",
        args: undefined,
        message: "Something broke",
      }),
    ]);
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("is not clickable for a runtime-error entry without a mappedLocation", () => {
    renderConsolePanel([
      makeEntry({
        type: "runtime-error",
        args: undefined,
        message: "Unmapped error",
        mappedLocation: null,
      }),
    ]);
    expect(
      screen.queryByRole("button", { name: /Unmapped error/ }),
    ).not.toBeInTheDocument();
  });

  it("is clickable for a runtime-error entry with a mappedLocation, and calls onFocusSource", async () => {
    const user = userEvent.setup();
    const location = { panel: "script" as const, line: 3 };
    const { onFocusSource } = renderConsolePanel([
      makeEntry({
        type: "runtime-error",
        args: undefined,
        message: "Mapped error",
        mappedLocation: location,
      }),
    ]);

    await user.click(screen.getByRole("button", { name: /Mapped error/ }));

    expect(onFocusSource).toHaveBeenCalledWith(location);
  });
});
