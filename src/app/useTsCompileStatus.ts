import { useCallback, useRef, useState } from "react";
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
  const previousResetKeyRef = useRef(resetKey);

  if (previousResetKeyRef.current !== resetKey) {
    previousResetKeyRef.current = resetKey;
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
