import { describe, expect, it } from "vitest";
import {
  isTsCompileRequest,
  isTsCompileResponse,
  TS_WORKER_PROTOCOL,
  TS_WORKER_VERSION,
} from "./tsWorkerProtocol";

function baseFields() {
  return {
    protocol: TS_WORKER_PROTOCOL,
    version: TS_WORKER_VERSION,
    buildId: "build-1",
  };
}

describe("isTsCompileRequest", () => {
  it("accepts a valid request", () => {
    expect(
      isTsCompileRequest({
        ...baseFields(),
        source: "const a = 1;",
        scriptLanguage: "typescript",
        executionMode: "classic",
      }),
    ).toBe(true);
  });

  it("rejects a non-object value", () => {
    expect(isTsCompileRequest("nope")).toBe(false);
    expect(isTsCompileRequest(null)).toBe(false);
    expect(isTsCompileRequest(undefined)).toBe(false);
  });

  it("rejects a wrong protocol or version", () => {
    expect(
      isTsCompileRequest({
        ...baseFields(),
        protocol: "other",
        source: "",
        scriptLanguage: "javascript",
        executionMode: "classic",
      }),
    ).toBe(false);
    expect(
      isTsCompileRequest({
        ...baseFields(),
        version: 2,
        source: "",
        scriptLanguage: "javascript",
        executionMode: "classic",
      }),
    ).toBe(false);
  });

  it("rejects a missing or empty buildId", () => {
    const { buildId, ...withoutBuildId } = baseFields();
    expect(
      isTsCompileRequest({
        ...withoutBuildId,
        source: "",
        scriptLanguage: "javascript",
        executionMode: "classic",
      }),
    ).toBe(false);
    expect(
      isTsCompileRequest({
        ...baseFields(),
        buildId: "",
        source: "",
        scriptLanguage: "javascript",
        executionMode: "classic",
      }),
    ).toBe(false);
  });

  it("rejects a non-string source", () => {
    expect(
      isTsCompileRequest({
        ...baseFields(),
        source: 42,
        scriptLanguage: "javascript",
        executionMode: "classic",
      }),
    ).toBe(false);
  });

  it("rejects an unknown scriptLanguage or executionMode", () => {
    expect(
      isTsCompileRequest({
        ...baseFields(),
        source: "",
        scriptLanguage: "python",
        executionMode: "classic",
      }),
    ).toBe(false);
    expect(
      isTsCompileRequest({
        ...baseFields(),
        source: "",
        scriptLanguage: "javascript",
        executionMode: "esm",
      }),
    ).toBe(false);
  });
});

describe("isTsCompileResponse", () => {
  it("accepts a valid response with no diagnostics", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [],
        emittedJs: "const a = 1;",
        lineMap: [1],
      }),
    ).toBe(true);
  });

  it("accepts a valid response with diagnostics and a null emit/lineMap", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [
          { message: "boom", category: "error", line: 1, column: 1 },
        ],
        emittedJs: null,
        lineMap: null,
      }),
    ).toBe(true);
  });

  it("accepts a diagnostic without line/column", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [{ message: "warn", category: "warning" }],
        emittedJs: "const a = 1;",
        lineMap: null,
      }),
    ).toBe(true);
  });

  it("rejects a non-object value", () => {
    expect(isTsCompileResponse("nope")).toBe(false);
    expect(isTsCompileResponse(null)).toBe(false);
  });

  it("rejects a wrong protocol or version", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        protocol: "other",
        diagnostics: [],
        emittedJs: null,
        lineMap: null,
      }),
    ).toBe(false);
    expect(
      isTsCompileResponse({
        ...baseFields(),
        version: 2,
        diagnostics: [],
        emittedJs: null,
        lineMap: null,
      }),
    ).toBe(false);
  });

  it("rejects a missing or empty buildId", () => {
    const { buildId, ...withoutBuildId } = baseFields();
    expect(
      isTsCompileResponse({
        ...withoutBuildId,
        diagnostics: [],
        emittedJs: null,
        lineMap: null,
      }),
    ).toBe(false);
  });

  it("rejects a non-array diagnostics field", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: "nope",
        emittedJs: null,
        lineMap: null,
      }),
    ).toBe(false);
  });

  it("rejects a malformed diagnostic entry", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [{ category: "error" }],
        emittedJs: null,
        lineMap: null,
      }),
    ).toBe(false);
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [{ message: "boom", category: "fatal" }],
        emittedJs: null,
        lineMap: null,
      }),
    ).toBe(false);
  });

  it("rejects a non-string, non-null emittedJs", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [],
        emittedJs: 1,
        lineMap: null,
      }),
    ).toBe(false);
  });

  it("rejects a malformed lineMap", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [],
        emittedJs: null,
        lineMap: "nope",
      }),
    ).toBe(false);
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [],
        emittedJs: null,
        lineMap: [1, "two"],
      }),
    ).toBe(false);
  });

  it("accepts a lineMap containing undefined entries", () => {
    expect(
      isTsCompileResponse({
        ...baseFields(),
        diagnostics: [],
        emittedJs: null,
        lineMap: [1, undefined, 2],
      }),
    ).toBe(true);
  });
});
