import { useCallback, useRef, useState } from "react";
import type { ScssCompileError } from "../preview/scssWorkerProtocol";

export interface UseScssCompileStatusResult {
  lastError: ScssCompileError | null;
  compiledCss: string | null;
  /** True whenever the last compile failed — the visible preview/compiled-CSS output is stale relative to the current source. */
  isStale: boolean;
  recordSuccess: (css: string) => void;
  recordFailure: (error: ScssCompileError) => void;
}

interface ScssCompileStatusState {
  lastError: ScssCompileError | null;
  compiledCss: string | null;
}

const INITIAL_STATE: ScssCompileStatusState = {
  lastError: null,
  compiledCss: null,
};

/**
 * Tracks the most recent SCSS compile outcome for the active project.
 * Resets to a clean slate whenever `resetKey` changes — callers pass
 * `` `${project.id}:${stylesheetLanguage}` `` so both switching projects and
 * toggling CSS<->SCSS within the same project start fresh, rather than
 * carrying over a stale error or compiled-CSS snapshot from an unrelated
 * project/language.
 */
export function useScssCompileStatus(
  resetKey: string,
): UseScssCompileStatusResult {
  const [state, setState] = useState<ScssCompileStatusState>(INITIAL_STATE);
  const previousResetKeyRef = useRef(resetKey);

  if (previousResetKeyRef.current !== resetKey) {
    previousResetKeyRef.current = resetKey;
    setState(INITIAL_STATE);
  }

  const recordSuccess = useCallback((css: string) => {
    setState({ lastError: null, compiledCss: css });
  }, []);

  const recordFailure = useCallback((error: ScssCompileError) => {
    setState((prev) => ({ lastError: error, compiledCss: prev.compiledCss }));
  }, []);

  return {
    lastError: state.lastError,
    compiledCss: state.compiledCss,
    isStale: state.lastError !== null,
    recordSuccess,
    recordFailure,
  };
}
