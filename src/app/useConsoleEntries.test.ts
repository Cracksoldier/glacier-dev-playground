import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsoleEntryInput } from "./useConsoleEntries";
import { MAX_CONSOLE_ENTRIES, useConsoleEntries } from "./useConsoleEntries";

function makeEntry(
  overrides: Partial<ConsoleEntryInput> = {},
): ConsoleEntryInput {
  return {
    type: "console",
    level: "log",
    timestampMs: Date.now(),
    args: [{ kind: "primitive", value: "hello" }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useConsoleEntries", () => {
  it("starts with no entries", () => {
    const { result } = renderHook(() => useConsoleEntries());
    expect(result.current.entries).toEqual([]);
  });

  it("appends an entry with a generated id and a relativeMs of 0 at the run's start", () => {
    const { result } = renderHook(() => useConsoleEntries());

    act(() => {
      result.current.append(makeEntry({ timestampMs: 1_000_000 }));
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBeTruthy();
    expect(result.current.entries[0].relativeMs).toBe(0);
  });

  it("computes relativeMs relative to when the run started", () => {
    const { result } = renderHook(() => useConsoleEntries());

    act(() => {
      result.current.append(makeEntry({ timestampMs: 1_000_500 }));
    });

    expect(result.current.entries[0].relativeMs).toBe(500);
  });

  it("startRun resets the relative-timestamp baseline for later appends", () => {
    const { result } = renderHook(() => useConsoleEntries());

    vi.setSystemTime(2_000_000);
    act(() => {
      result.current.startRun();
    });
    act(() => {
      result.current.append(makeEntry({ timestampMs: 2_000_300 }));
    });

    expect(result.current.entries[0].relativeMs).toBe(300);
  });

  it("startRun does not clear existing entries", () => {
    const { result } = renderHook(() => useConsoleEntries());

    act(() => {
      result.current.append(makeEntry());
    });
    act(() => {
      result.current.startRun();
    });

    expect(result.current.entries).toHaveLength(1);
  });

  it("clear empties the entry list", () => {
    const { result } = renderHook(() => useConsoleEntries());

    act(() => {
      result.current.append(makeEntry());
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.entries).toEqual([]);
  });

  it("assigns each appended entry a unique id", () => {
    const { result } = renderHook(() => useConsoleEntries());

    act(() => {
      result.current.append(makeEntry());
      result.current.append(makeEntry());
    });

    const [first, second] = result.current.entries;
    expect(first.id).not.toBe(second.id);
  });

  it("keeps only the most recent MAX_CONSOLE_ENTRIES entries", () => {
    const { result } = renderHook(() => useConsoleEntries());

    act(() => {
      for (let index = 0; index < MAX_CONSOLE_ENTRIES + 5; index += 1) {
        result.current.append(makeEntry({ message: `entry ${index}` }));
      }
    });

    const { entries } = result.current;
    expect(entries).toHaveLength(MAX_CONSOLE_ENTRIES);
    expect(entries[0].message).toBe("entry 5");
    expect(entries.at(-1)?.message).toBe(`entry ${MAX_CONSOLE_ENTRIES + 4}`);
  });
});
