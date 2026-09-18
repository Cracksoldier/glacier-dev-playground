import { describe, expect, it } from "vitest";
import {
  isPreviewMessage,
  PREVIEW_MESSAGE_PROTOCOL,
  PREVIEW_MESSAGE_VERSION,
  type SerializedValue,
} from "./previewMessage";

function baseFields() {
  return {
    protocol: PREVIEW_MESSAGE_PROTOCOL,
    version: PREVIEW_MESSAGE_VERSION,
    executionId: "execution-1",
  };
}

describe("isPreviewMessage", () => {
  it("accepts a valid ready message", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "ready",
        payload: { timestampMs: 1 },
      }),
    ).toBe(true);
  });

  it("accepts a valid console message with primitive args", () => {
    const value: SerializedValue = { kind: "primitive", value: "hello" };
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "console",
        payload: { level: "log", args: [value], timestampMs: 1 },
      }),
    ).toBe(true);
  });

  it("accepts a valid console clear message with no args", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "console",
        payload: { level: "clear", args: [], timestampMs: 1 },
      }),
    ).toBe(true);
  });

  it("accepts a valid runtime-error message with optional fields omitted", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "runtime-error",
        payload: { message: "boom", timestampMs: 1 },
      }),
    ).toBe(true);
  });

  it("accepts a valid runtime-error message with all fields present", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "runtime-error",
        payload: {
          message: "boom",
          line: 3,
          column: 5,
          stack: "Error: boom\n at x",
          timestampMs: 1,
        },
      }),
    ).toBe(true);
  });

  it("accepts a valid unhandled-rejection message", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "unhandled-rejection",
        payload: {
          reason: { kind: "error", name: "TypeError", message: "nope" },
          timestampMs: 1,
        },
      }),
    ).toBe(true);
  });

  it("accepts a valid resource-error message", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "resource-error",
        payload: {
          url: "https://example.com/x.png",
          message: "404",
          timestampMs: 1,
        },
      }),
    ).toBe(true);
  });

  it("accepts nested array/object SerializedValue trees", () => {
    const value: SerializedValue = {
      kind: "object",
      truncated: false,
      entries: [
        ["a", { kind: "primitive", value: 1 }],
        [
          "b",
          {
            kind: "array",
            truncated: true,
            items: [{ kind: "circular" }, { kind: "function", name: "f" }],
          },
        ],
      ],
    };
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "console",
        payload: { level: "warn", args: [value], timestampMs: 1 },
      }),
    ).toBe(true);
  });

  it("rejects a non-object value", () => {
    expect(isPreviewMessage("not an object")).toBe(false);
    expect(isPreviewMessage(null)).toBe(false);
    expect(isPreviewMessage(undefined)).toBe(false);
  });

  it("rejects a wrong protocol", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        protocol: "some-other-protocol",
        type: "ready",
        payload: { timestampMs: 1 },
      }),
    ).toBe(false);
  });

  it("rejects a wrong version", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        version: 2,
        type: "ready",
        payload: { timestampMs: 1 },
      }),
    ).toBe(false);
  });

  it("rejects a missing or empty executionId", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        executionId: "",
        type: "ready",
        payload: { timestampMs: 1 },
      }),
    ).toBe(false);
    const { executionId, ...withoutExecutionId } = baseFields();
    expect(
      isPreviewMessage({
        ...withoutExecutionId,
        type: "ready",
        payload: { timestampMs: 1 },
      }),
    ).toBe(false);
  });

  it("rejects an unknown message type", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "not-a-real-type",
        payload: { timestampMs: 1 },
      }),
    ).toBe(false);
  });

  it("rejects a malformed payload for a known type", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "console",
        payload: { level: "not-a-level", args: [], timestampMs: 1 },
      }),
    ).toBe(false);
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "runtime-error",
        payload: { message: 42, timestampMs: 1 },
      }),
    ).toBe(false);
  });

  it("rejects a message missing the payload entirely", () => {
    expect(
      isPreviewMessage({
        ...baseFields(),
        type: "ready",
      }),
    ).toBe(false);
  });
});
