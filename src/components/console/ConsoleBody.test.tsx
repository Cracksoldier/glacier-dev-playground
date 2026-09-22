import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleEntry } from "../../app/useConsoleEntries";
import type { MappedSourceLocation } from "../../preview/mapErrorToSource";
import { ProjectStoreProvider } from "../../store/ProjectStoreContext";
import { createInMemoryProjectRepository } from "../../test/inMemoryProjectRepository";
import ConsoleBody from "./ConsoleBody";

function renderConsoleBody(
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
      <ConsoleBody
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

describe("ConsoleBody", () => {
  it("shows an empty state message when there are no entries", () => {
    renderConsoleBody([]);
    expect(screen.getByText("No console output yet.")).toBeInTheDocument();
  });

  it("calls onClear when the Clear button is clicked", async () => {
    const user = userEvent.setup();
    const { onClear } = renderConsoleBody([makeEntry()]);

    await user.click(screen.getByRole("button", { name: /Clear/ }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("reflects the project's preserveConsole setting in the checkbox", () => {
    renderConsoleBody([]);
    expect(
      screen.getByRole("checkbox", { name: "Preserve logs" }),
    ).not.toBeChecked();
  });

  it("toggles preserveConsole when the checkbox is clicked", async () => {
    const user = userEvent.setup();
    renderConsoleBody([]);
    const checkbox = screen.getByRole("checkbox", { name: "Preserve logs" });

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it("renders a console entry's relative time and args", () => {
    renderConsoleBody([
      makeEntry({ relativeMs: 250, args: [{ kind: "primitive", value: 42 }] }),
    ]);
    expect(screen.getByText("+250ms")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("is clickable for a runtime-error entry with a mappedLocation, and calls onFocusSource", async () => {
    const user = userEvent.setup();
    const location = { panel: "script" as const, line: 3 };
    const { onFocusSource } = renderConsoleBody([
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

  it("renders a text severity label alongside each entry, not just a color cue", () => {
    renderConsoleBody([
      makeEntry({ id: "e1", level: "log" }),
      makeEntry({ id: "e2", level: "warn" }),
      makeEntry({ id: "e3", level: "debug" }),
      makeEntry({
        id: "e4",
        type: "runtime-error",
        args: undefined,
        message: "boom",
      }),
    ]);

    expect(screen.getByText("LOG")).toBeInTheDocument();
    expect(screen.getByText("WARN")).toBeInTheDocument();
    expect(screen.getByText("DEBUG")).toBeInTheDocument();
    expect(screen.getByText("ERROR")).toBeInTheDocument();
  });
});
