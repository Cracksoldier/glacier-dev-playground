import { useCallback, useReducer } from "react";
import type { MappedSourceLocation } from "../preview/mapErrorToSource";
import type {
  ConsoleLevel,
  PreviewMessage,
  SerializedValue,
} from "../preview/previewMessage";

export interface ConsoleEntry {
  id: string;
  type: PreviewMessage["type"] | "scss-compile-error" | "script-diagnostic";
  level?: ConsoleLevel;
  timestampMs: number;
  relativeMs: number;
  args?: SerializedValue[];
  message?: string;
  stack?: string;
  mappedLocation?: MappedSourceLocation | null;
  /** Set only on `scss-compile-error` entries — the Sass-reported source position, already 1-indexed. */
  scssLocation?: { line: number; column?: number } | null;
  /** Set only on `script-diagnostic` entries — the TS/JS-reported source position, already 1-indexed. */
  scriptLocation?: { line: number; column?: number } | null;
}

export type ConsoleEntryInput = Omit<ConsoleEntry, "id" | "relativeMs">;

export interface UseConsoleEntriesResult {
  entries: ConsoleEntry[];
  /** Resets the relative-timestamp baseline for a newly-started run. Does not itself clear entries — callers decide that based on the "preserve logs" setting. */
  startRun: () => void;
  clear: () => void;
  append: (entry: ConsoleEntryInput) => void;
}

interface ConsoleEntriesState {
  entries: ConsoleEntry[];
  runStartMs: number;
}

type ConsoleEntriesAction =
  | { type: "start-run" }
  | { type: "clear" }
  | { type: "append"; entry: ConsoleEntryInput };

function createInitialState(): ConsoleEntriesState {
  return { entries: [], runStartMs: Date.now() };
}

function reducer(
  state: ConsoleEntriesState,
  action: ConsoleEntriesAction,
): ConsoleEntriesState {
  switch (action.type) {
    case "start-run":
      return { ...state, runStartMs: Date.now() };
    case "clear":
      return { ...state, entries: [] };
    case "append": {
      const entry: ConsoleEntry = {
        ...action.entry,
        id: crypto.randomUUID(),
        relativeMs: action.entry.timestampMs - state.runStartMs,
      };
      return { ...state, entries: [...state.entries, entry] };
    }
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}

/**
 * Project-agnostic console entry log: holds no reference to the active
 * project or store, so it's callable from `AppShell` alongside the other
 * ref/hook-level state it owns. `PreviewPanel` (which does have store
 * access) is responsible for deciding when a build's messages should clear
 * prior entries (the "preserve logs" setting) and for mapping a
 * `runtime-error` message's line to a `mappedLocation` before calling
 * `append`.
 */
export function useConsoleEntries(): UseConsoleEntriesResult {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const startRun = useCallback(() => dispatch({ type: "start-run" }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const append = useCallback(
    (entry: ConsoleEntryInput) => dispatch({ type: "append", entry }),
    [],
  );

  return { entries: state.entries, startRun, clear, append };
}
