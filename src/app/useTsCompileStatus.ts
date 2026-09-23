import { useCallback, useState } from "react";
import type { TsDiagnostic } from "../preview/tsWorkerProtocol";

export interface UseTsCompileStatusResult {
  diagnostics: TsDiagnostic[];
  /** True whenever the last compile produced a blocking (`category: "error"`) diagnostic — the visible preview/editor markers are stale relative to the current source. */
  isStale: boolean;
  recordResult: (diagnostics: TsDiagnostic[]) => void;
}

/**
 * Tracks the most recent TS/JS compile outcome for the active project.
 * Resets to a clean slate whenever `resetKey` changes — callers pass
 * `` `${project.id}:${scriptLanguage}:${executionMode}` `` so switching
 * projects, toggling JS<->TS, and toggling classic<->module within the same
 * project all start fresh, rather than carrying over stale diagnostics from
 * an unrelated project/language/mode.
 */
export function useTsCompileStatus(resetKey: string): UseTsCompileStatusResult {
  const [diagnostics, setDiagnostics] = useState<TsDiagnostic[]>([]);
  // Previous key kept in state, not a ref: React's "adjust state when a prop
  // changes" pattern. A ref mutated during render would stay updated even if
  // that render were discarded, and the retry would then skip the reset.
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);

  if (previousResetKey !== resetKey) {
    setPreviousResetKey(resetKey);
    setDiagnostics([]);
  }

  const recordResult = useCallback((next: TsDiagnostic[]) => {
    setDiagnostics(next);
  }, []);

  return {
    diagnostics,
    isStale: diagnostics.some((diagnostic) => diagnostic.category === "error"),
    recordResult,
  };
}
