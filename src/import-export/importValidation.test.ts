import { describe, expect, it } from "vitest";
import { PROJECT_SCHEMA_VERSION } from "../models/project";
import {
  IMPORT_MAX_SIZE_BYTES,
  parseImportedProjectJson,
} from "./importValidation";

function validProjectJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: "some-id",
    title: "  My   Project  ",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    trusted: true,
    source: {
      html: "<p>hi</p>",
      stylesheet: "p { color: red; }",
      stylesheetLanguage: "css",
      script: "console.log(1);",
      scriptLanguage: "javascript",
      executionMode: "classic",
      headContent: "",
    },
    resources: [
      {
        id: "res-1",
        name: "Lodash",
        url: "https://example.com/lodash.js",
        type: "script",
        enabled: true,
        order: 0,
      },
    ],
    settings: {
      autoRun: true,
      previewDebounceMs: 400,
      preserveConsole: false,
    },
    ...overrides,
  });
}

describe("parseImportedProjectJson", () => {
  it("accepts a valid project and returns a sanitized draft", () => {
    const result = parseImportedProjectJson(validProjectJson());

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.draft.title).toBe("My Project");
    expect(result.draft.source.html).toBe("<p>hi</p>");
    expect(result.draft.resources).toHaveLength(1);
    expect(result.draft.settings.autoRun).toBe(true);
    expect(result.draft).not.toHaveProperty("id");
    expect(result.draft).not.toHaveProperty("trusted");
    expect(result.draft).not.toHaveProperty("createdAt");
    expect(result.draft).not.toHaveProperty("schemaVersion");
  });

  it("rejects input larger than the size limit", () => {
    const oversized = "x".repeat(IMPORT_MAX_SIZE_BYTES + 1);
    expect(parseImportedProjectJson(oversized)).toEqual({
      status: "too-large",
    });
  });

  it("accepts input exactly at the size limit boundary if otherwise valid", () => {
    const json = validProjectJson();
    // Padding an oversized headContent value to land exactly at the byte
    // boundary would be fragile; instead just confirm the boundary check is
    // strictly "greater than", not "greater than or equal to", using a
    // string of exactly the limit's length that is intentionally invalid
    // JSON (so we only assert it is NOT rejected as too-large).
    const exact = `${json}${" ".repeat(Math.max(0, IMPORT_MAX_SIZE_BYTES - json.length))}`;
    const result = parseImportedProjectJson(exact);
    expect(result.status).not.toBe("too-large");
  });

  it("rejects malformed JSON", () => {
    expect(parseImportedProjectJson("{not json")).toEqual({
      status: "malformed-json",
    });
  });

  it("rejects an unsupported future schema version", () => {
    const json = validProjectJson({
      schemaVersion: PROJECT_SCHEMA_VERSION + 1,
    });
    expect(parseImportedProjectJson(json)).toEqual({
      status: "unsupported-future-version",
      version: PROJECT_SCHEMA_VERSION + 1,
    });
  });

  it("rejects a record missing required top-level fields", () => {
    const result = parseImportedProjectJson(
      JSON.stringify({ schemaVersion: 1 }),
    );
    expect(result.status).toBe("invalid");
  });

  it.each([
    ["html", 42],
    ["stylesheet", 42],
    ["stylesheetLanguage", "less"],
    ["script", 42],
    ["scriptLanguage", "coffeescript"],
    ["executionMode", "iife"],
    ["headContent", 42],
  ])("rejects source.%s with an invalid value", (field, badValue) => {
    const json = validProjectJson({
      source: {
        html: "",
        stylesheet: "",
        stylesheetLanguage: "css",
        script: "",
        scriptLanguage: "javascript",
        executionMode: "classic",
        headContent: "",
        [field]: badValue,
      },
    });
    const result = parseImportedProjectJson(json);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toContain(`source.${field}`);
    }
  });

  it.each([
    ["autoRun", "yes"],
    ["previewDebounceMs", -1],
    ["previewDebounceMs", Number.NaN],
    ["preserveConsole", "no"],
  ])("rejects settings.%s with an invalid value", (field, badValue) => {
    const json = validProjectJson({
      settings: {
        autoRun: true,
        previewDebounceMs: 400,
        preserveConsole: false,
        [field]: badValue,
      },
    });
    const result = parseImportedProjectJson(json);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toContain(`settings.${field}`);
    }
  });

  it("rejects a resource with an invalid url", () => {
    const json = validProjectJson({
      resources: [
        {
          id: "res-1",
          name: "Evil",
          url: "javascript:alert(1)",
          type: "script",
          enabled: true,
          order: 0,
        },
      ],
    });
    const result = parseImportedProjectJson(json);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toContain("resources[0].url");
    }
  });

  it.each([
    ["type", "stylesheet-bad"],
    ["enabled", "yes"],
    ["order", "first"],
    ["integrity", 42],
    ["crossOrigin", "credentials"],
  ])("rejects resources[0].%s with an invalid value", (field, badValue) => {
    const json = validProjectJson({
      resources: [
        {
          id: "res-1",
          name: "Lodash",
          url: "https://example.com/lodash.js",
          type: "script",
          enabled: true,
          order: 0,
          [field]: badValue,
        },
      ],
    });
    const result = parseImportedProjectJson(json);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toContain(`resources[0].${field}`);
    }
  });

  it("rejects a non-array resources field", () => {
    const json = validProjectJson({ resources: "nope" });
    const result = parseImportedProjectJson(json);
    expect(result.status).toBe("invalid");
  });

  it("never lets a positive trusted value in the file survive into the draft", () => {
    const json = validProjectJson({ trusted: true });
    const result = parseImportedProjectJson(json);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.draft).not.toHaveProperty("trusted");
    }
  });

  it("accepts a real exported document, which omits id and trusted", () => {
    // Mirrors serializeProjectForExport's actual output shape, not the
    // fixture above (which always includes id/trusted) — a real export
    // omits both by design, and must still round-trip through import.
    const json = JSON.stringify({
      schemaVersion: PROJECT_SCHEMA_VERSION,
      title: "Exported Project",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      source: {
        html: "<p>hi</p>",
        stylesheet: "p { color: red; }",
        stylesheetLanguage: "css",
        script: "console.log(1);",
        scriptLanguage: "javascript",
        executionMode: "classic",
        headContent: "",
      },
      resources: [],
      settings: {
        autoRun: true,
        previewDebounceMs: 400,
        preserveConsole: false,
      },
    });

    const result = parseImportedProjectJson(json);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.draft.title).toBe("Exported Project");
      expect(result.draft).not.toHaveProperty("id");
    }
  });
});
