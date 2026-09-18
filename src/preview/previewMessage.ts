export const PREVIEW_MESSAGE_PROTOCOL = "glacier-dev-playground-preview";
export const PREVIEW_MESSAGE_VERSION = 1;

export type ConsoleLevel =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "clear";

export type SerializedValue =
  | { kind: "primitive"; value: string | number | boolean | null }
  | { kind: "array"; items: SerializedValue[]; truncated: boolean }
  | { kind: "object"; entries: [string, SerializedValue][]; truncated: boolean }
  | { kind: "error"; name: string; message: string; stack?: string }
  | {
      kind: "node";
      tagName: string;
      id?: string;
      className?: string;
      preview: string;
    }
  | { kind: "function"; name: string }
  | { kind: "circular" }
  | { kind: "unsupported"; tag: string };

interface PreviewMessageBase {
  protocol: typeof PREVIEW_MESSAGE_PROTOCOL;
  version: typeof PREVIEW_MESSAGE_VERSION;
  executionId: string;
}

export type PreviewMessage =
  | (PreviewMessageBase & {
      type: "ready";
      payload: { timestampMs: number };
    })
  | (PreviewMessageBase & {
      type: "console";
      payload: {
        level: ConsoleLevel;
        args: SerializedValue[];
        timestampMs: number;
      };
    })
  | (PreviewMessageBase & {
      type: "runtime-error";
      payload: {
        message: string;
        line?: number;
        column?: number;
        stack?: string;
        timestampMs: number;
      };
    })
  | (PreviewMessageBase & {
      type: "unhandled-rejection";
      payload: { reason: SerializedValue; timestampMs: number };
    })
  | (PreviewMessageBase & {
      type: "resource-error";
      payload: { url: string; message: string; timestampMs: number };
    });

const CONSOLE_LEVELS: readonly ConsoleLevel[] = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "clear",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConsoleLevel(value: unknown): value is ConsoleLevel {
  return (
    typeof value === "string" &&
    (CONSOLE_LEVELS as readonly string[]).includes(value)
  );
}

/**
 * Structural validation only — this checks that a `SerializedValue` tree has
 * the right discriminant tags and container shapes, not that every nested
 * primitive is exactly right. That's sufficient here: the tree only ever
 * comes from this codebase's own bridge script (see `previewBridge.ts`), so
 * this is a defense against a stale/mismatched-version bridge or a malformed
 * message, not against an adversarial payload shape.
 */
function isSerializedValue(value: unknown): value is SerializedValue {
  if (!isPlainObject(value)) return false;
  switch (value.kind) {
    case "primitive":
      return (
        typeof value.value === "string" ||
        typeof value.value === "number" ||
        typeof value.value === "boolean" ||
        value.value === null
      );
    case "array":
      return (
        Array.isArray(value.items) &&
        value.items.every(isSerializedValue) &&
        typeof value.truncated === "boolean"
      );
    case "object":
      return (
        Array.isArray(value.entries) &&
        value.entries.every(
          (entry) =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === "string" &&
            isSerializedValue(entry[1]),
        ) &&
        typeof value.truncated === "boolean"
      );
    case "error":
      return (
        typeof value.name === "string" &&
        typeof value.message === "string" &&
        (value.stack === undefined || typeof value.stack === "string")
      );
    case "node":
      return (
        typeof value.tagName === "string" &&
        (value.id === undefined || typeof value.id === "string") &&
        (value.className === undefined ||
          typeof value.className === "string") &&
        typeof value.preview === "string"
      );
    case "function":
      return typeof value.name === "string";
    case "circular":
      return true;
    case "unsupported":
      return typeof value.tag === "string";
    default:
      return false;
  }
}

function hasBaseShape(
  value: Record<string, unknown>,
): value is Record<string, unknown> & PreviewMessageBase {
  return (
    value.protocol === PREVIEW_MESSAGE_PROTOCOL &&
    value.version === PREVIEW_MESSAGE_VERSION &&
    typeof value.executionId === "string" &&
    value.executionId.length > 0
  );
}

function isValidPayload(
  type: PreviewMessage["type"],
  payload: unknown,
): boolean {
  if (!isPlainObject(payload)) return false;
  switch (type) {
    case "ready":
      return typeof payload.timestampMs === "number";
    case "console":
      return (
        isConsoleLevel(payload.level) &&
        Array.isArray(payload.args) &&
        payload.args.every(isSerializedValue) &&
        typeof payload.timestampMs === "number"
      );
    case "runtime-error":
      return (
        typeof payload.message === "string" &&
        (payload.line === undefined || typeof payload.line === "number") &&
        (payload.column === undefined || typeof payload.column === "number") &&
        (payload.stack === undefined || typeof payload.stack === "string") &&
        typeof payload.timestampMs === "number"
      );
    case "unhandled-rejection":
      return (
        isSerializedValue(payload.reason) &&
        typeof payload.timestampMs === "number"
      );
    case "resource-error":
      return (
        typeof payload.url === "string" &&
        typeof payload.message === "string" &&
        typeof payload.timestampMs === "number"
      );
    default:
      return false;
  }
}

const MESSAGE_TYPES: readonly PreviewMessage["type"][] = [
  "ready",
  "console",
  "runtime-error",
  "unhandled-rejection",
  "resource-error",
];

/**
 * The single validation boundary for messages arriving via `postMessage`
 * from the sandboxed preview iframe — untrusted input from the app's own
 * perspective, since the iframe's opaque origin means the parent cannot
 * assert who actually sent a given message beyond checking `event.source`
 * (see `PreviewFrame.tsx`). Rejects anything with the wrong protocol/version,
 * a missing execution id, an unknown type, or a malformed payload.
 */
export function isPreviewMessage(value: unknown): value is PreviewMessage {
  if (!isPlainObject(value)) return false;
  if (!hasBaseShape(value)) return false;
  if (
    typeof value.type !== "string" ||
    !(MESSAGE_TYPES as readonly string[]).includes(value.type)
  ) {
    return false;
  }
  // `value.type` was just checked against every literal in MESSAGE_TYPES
  // above, so this cast merely restores the literal-union type TS lost when
  // narrowing against a widened `readonly string[]`.
  return isValidPayload(value.type as PreviewMessage["type"], value.payload);
}
