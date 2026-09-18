export const SCSS_WORKER_PROTOCOL = "glacier-dev-playground-scss-worker";
export const SCSS_WORKER_VERSION = 1;

export interface ScssCompileError {
  message: string;
  line?: number;
  column?: number;
  sourceExcerpt?: string;
}

interface ScssWorkerMessageBase {
  protocol: typeof SCSS_WORKER_PROTOCOL;
  version: typeof SCSS_WORKER_VERSION;
  buildId: string;
}

export type ScssCompileRequest = ScssWorkerMessageBase & {
  source: string;
};

export type ScssCompileResponse =
  | (ScssWorkerMessageBase & { type: "success"; css: string })
  | (ScssWorkerMessageBase & { type: "failure"; error: ScssCompileError });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasBaseShape(
  value: Record<string, unknown>,
): value is Record<string, unknown> & ScssWorkerMessageBase {
  return (
    value.protocol === SCSS_WORKER_PROTOCOL &&
    value.version === SCSS_WORKER_VERSION &&
    typeof value.buildId === "string" &&
    value.buildId.length > 0
  );
}

function isScssCompileError(value: unknown): value is ScssCompileError {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.message === "string" &&
    (value.line === undefined || typeof value.line === "number") &&
    (value.column === undefined || typeof value.column === "number") &&
    (value.sourceExcerpt === undefined ||
      typeof value.sourceExcerpt === "string")
  );
}

/**
 * The single validation boundary for requests arriving in the SCSS
 * compiler worker via `postMessage` from the main thread. Same-origin
 * module worker, so this guards against a malformed/stale-caller shape
 * rather than an adversarial payload (see `isScssCompileResponse`'s
 * analogous doc comment).
 */
export function isScssCompileRequest(
  value: unknown,
): value is ScssCompileRequest {
  if (!isPlainObject(value)) return false;
  if (!hasBaseShape(value)) return false;
  return typeof value.source === "string";
}

/**
 * The single validation boundary for responses arriving from the SCSS
 * compiler worker on the main thread — guards against a stale cached
 * worker script (e.g. right after a deploy) posting a shape the current
 * client doesn't expect, not against an adversarial payload (same-origin
 * module worker, not the sandboxed preview iframe's opaque-origin channel
 * modeled by `previewMessage.ts`).
 */
export function isScssCompileResponse(
  value: unknown,
): value is ScssCompileResponse {
  if (!isPlainObject(value)) return false;
  if (!hasBaseShape(value)) return false;
  switch (value.type) {
    case "success":
      return typeof value.css === "string";
    case "failure":
      return isScssCompileError(value.error);
    default:
      return false;
  }
}
