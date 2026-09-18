import { describe, expect, it } from "vitest";
import {
  isScssCompileRequest,
  isScssCompileResponse,
  SCSS_WORKER_PROTOCOL,
  SCSS_WORKER_VERSION,
} from "./scssWorkerProtocol";

function baseFields() {
  return {
    protocol: SCSS_WORKER_PROTOCOL,
    version: SCSS_WORKER_VERSION,
    buildId: "build-1",
  };
}

describe("isScssCompileRequest", () => {
  it("accepts a valid request", () => {
    expect(
      isScssCompileRequest({ ...baseFields(), source: ".a { color: red; }" }),
    ).toBe(true);
  });

  it("rejects a non-object value", () => {
    expect(isScssCompileRequest("nope")).toBe(false);
    expect(isScssCompileRequest(null)).toBe(false);
    expect(isScssCompileRequest(undefined)).toBe(false);
  });

  it("rejects a wrong protocol or version", () => {
    expect(
      isScssCompileRequest({
        ...baseFields(),
        protocol: "other",
        source: "",
      }),
    ).toBe(false);
    expect(
      isScssCompileRequest({ ...baseFields(), version: 2, source: "" }),
    ).toBe(false);
  });

  it("rejects a missing or empty buildId", () => {
    const { buildId, ...withoutBuildId } = baseFields();
    expect(isScssCompileRequest({ ...withoutBuildId, source: "" })).toBe(false);
    expect(
      isScssCompileRequest({ ...baseFields(), buildId: "", source: "" }),
    ).toBe(false);
  });

  it("rejects a non-string source", () => {
    expect(isScssCompileRequest({ ...baseFields(), source: 42 })).toBe(false);
  });
});

describe("isScssCompileResponse", () => {
  it("accepts a valid success response", () => {
    expect(
      isScssCompileResponse({
        ...baseFields(),
        type: "success",
        css: ".a { color: red; }",
      }),
    ).toBe(true);
  });

  it("accepts a valid failure response with full error fields", () => {
    expect(
      isScssCompileResponse({
        ...baseFields(),
        type: "failure",
        error: {
          message: "Expected expression.",
          line: 3,
          column: 5,
          sourceExcerpt: "  color: ;",
        },
      }),
    ).toBe(true);
  });

  it("accepts a valid failure response with only message", () => {
    expect(
      isScssCompileResponse({
        ...baseFields(),
        type: "failure",
        error: { message: "boom" },
      }),
    ).toBe(true);
  });

  it("rejects a non-object value", () => {
    expect(isScssCompileResponse("nope")).toBe(false);
    expect(isScssCompileResponse(null)).toBe(false);
  });

  it("rejects a wrong protocol or version", () => {
    expect(
      isScssCompileResponse({
        ...baseFields(),
        protocol: "other",
        type: "success",
        css: "",
      }),
    ).toBe(false);
    expect(
      isScssCompileResponse({
        ...baseFields(),
        version: 2,
        type: "success",
        css: "",
      }),
    ).toBe(false);
  });

  it("rejects a missing or empty buildId", () => {
    const { buildId, ...withoutBuildId } = baseFields();
    expect(
      isScssCompileResponse({ ...withoutBuildId, type: "success", css: "" }),
    ).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(isScssCompileResponse({ ...baseFields(), type: "pending" })).toBe(
      false,
    );
  });

  it("rejects a success response with a non-string css", () => {
    expect(
      isScssCompileResponse({ ...baseFields(), type: "success", css: 1 }),
    ).toBe(false);
  });

  it("rejects a failure response with a malformed error", () => {
    expect(
      isScssCompileResponse({
        ...baseFields(),
        type: "failure",
        error: { line: "not a number" },
      }),
    ).toBe(false);
    expect(isScssCompileResponse({ ...baseFields(), type: "failure" })).toBe(
      false,
    );
  });
});
