import type { ExecutionMode, ScriptLanguage } from "../models/project";

export const TS_WORKER_PROTOCOL = "glacier-dev-playground-ts-worker";
export const TS_WORKER_VERSION = 1;

/**
 * `category` distinguishes blocking issues (syntax/type errors, classic-mode
 * import/export rejection, unresolved bare/relative imports) from
 * non-blocking notices (the absolute-HTTPS-import "treated as `any`"
 * warning) — see `tsCompiler.ts#compileScript`'s "no blocking diagnostic"
 * emit gate.
 */
export interface TsDiagnostic {
  message: string;
  category: "error" | "warning";
  line?: number;
  column?: number;
}

interface TsWorkerMessageBase {
  protocol: typeof TS_WORKER_PROTOCOL;
  version: typeof TS_WORKER_VERSION;
  buildId: string;
}

export type TsCompileRequest = TsWorkerMessageBase & {
  source: string;
  scriptLanguage: ScriptLanguage;
  executionMode: ExecutionMode;
};

/**
 * No success/failure discriminant — diagnostics and a successful emit can
 * coexist (e.g. a non-blocking remote-import warning alongside emitted JS).
 * Outcome is read from the `emittedJs`/`lineMap` vs. `diagnostics` values
 * instead: `emittedJs` is non-null exactly when no `category: "error"`
 * diagnostic was produced (see `tsCompiler.ts`).
 */
export type TsCompileResponse = TsWorkerMessageBase & {
  diagnostics: TsDiagnostic[];
  emittedJs: string | null;
  lineMap: (number | undefined)[] | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasBaseShape(
  value: Record<string, unknown>,
): value is Record<string, unknown> & TsWorkerMessageBase {
  return (
    value.protocol === TS_WORKER_PROTOCOL &&
    value.version === TS_WORKER_VERSION &&
    typeof value.buildId === "string" &&
    value.buildId.length > 0
  );
}

function isScriptLanguage(value: unknown): value is ScriptLanguage {
  return value === "javascript" || value === "typescript";
}

function isExecutionMode(value: unknown): value is ExecutionMode {
  return value === "classic" || value === "module";
}

function isTsDiagnostic(value: unknown): value is TsDiagnostic {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.message === "string" &&
    (value.category === "error" || value.category === "warning") &&
    (value.line === undefined || typeof value.line === "number") &&
    (value.column === undefined || typeof value.column === "number")
  );
}

function isLineMap(value: unknown): value is (number | undefined)[] | null {
  if (value === null) return true;
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) => entry === undefined || typeof entry === "number",
  );
}

/**
 * The single validation boundary for requests arriving in the TS/JS
 * compiler worker via `postMessage` from the main thread. Same-origin
 * module worker, so this guards against a malformed/stale-caller shape
 * rather than an adversarial payload (see `isTsCompileResponse`'s analogous
 * doc comment).
 */
export function isTsCompileRequest(value: unknown): value is TsCompileRequest {
  if (!isPlainObject(value)) return false;
  if (!hasBaseShape(value)) return false;
  return (
    typeof value.source === "string" &&
    isScriptLanguage(value.scriptLanguage) &&
    isExecutionMode(value.executionMode)
  );
}

/**
 * The single validation boundary for responses arriving from the TS/JS
 * compiler worker on the main thread — guards against a stale cached
 * worker script (e.g. right after a deploy) posting a shape the current
 * client doesn't expect, not against an adversarial payload (same-origin
 * module worker, not the sandboxed preview iframe's opaque-origin channel
 * modeled by `previewMessage.ts`).
 */
export function isTsCompileResponse(
  value: unknown,
): value is TsCompileResponse {
  if (!isPlainObject(value)) return false;
  if (!hasBaseShape(value)) return false;
  return (
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isTsDiagnostic) &&
    (value.emittedJs === null || typeof value.emittedJs === "string") &&
    isLineMap(value.lineMap)
  );
}
