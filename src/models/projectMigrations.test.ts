import { describe, expect, it } from "vitest";
import {
  type ProjectMigrationStep,
  recoverProjectRecord,
} from "./projectMigrations";

function validRawProject(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    id: "abc-123",
    title: "My Project",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    source: {
      html: "",
      stylesheet: "",
      stylesheetLanguage: "css",
      script: "",
      scriptLanguage: "javascript",
      executionMode: "classic",
      headContent: "",
    },
    resources: [],
    settings: { autoRun: true, previewDebounceMs: 400, preserveConsole: false },
    ...overrides,
  };
}

describe("recoverProjectRecord", () => {
  it("accepts a valid record at the current version", () => {
    const result = recoverProjectRecord(validRawProject(), 1, {});

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.project.id).toBe("abc-123");
    }
  });

  it("rejects a record with a schemaVersion newer than current, without throwing", () => {
    const result = recoverProjectRecord(
      validRawProject({ schemaVersion: 5 }),
      1,
      {},
    );

    expect(result).toEqual({
      status: "unsupported-future-version",
      version: 5,
    });
  });

  it("marks non-object input as invalid", () => {
    expect(recoverProjectRecord(null, 1, {}).status).toBe("invalid");
    expect(recoverProjectRecord("not an object", 1, {}).status).toBe("invalid");
    expect(recoverProjectRecord([1, 2, 3], 1, {}).status).toBe("invalid");
  });

  it("marks a record missing schemaVersion as invalid", () => {
    const { schemaVersion: _schemaVersion, ...withoutVersion } =
      validRawProject();

    expect(recoverProjectRecord(withoutVersion, 1, {}).status).toBe("invalid");
  });

  it("marks a structurally malformed record as invalid", () => {
    const result = recoverProjectRecord(
      validRawProject({ source: "not an object" }),
      1,
      {},
    );

    expect(result.status).toBe("invalid");
  });

  it("marks a record whose version has no migration step as invalid", () => {
    const result = recoverProjectRecord(
      validRawProject({ schemaVersion: 0 }),
      1,
      {},
    );

    expect(result.status).toBe("invalid");
  });

  it("applies a chain of synthetic migration steps sequentially", () => {
    const v0ToV1: ProjectMigrationStep = (input) => ({
      ...input,
      title: `${input.title as string} (migrated from v0)`,
    });
    const v1ToV2: ProjectMigrationStep = (input) => ({
      ...input,
      title: `${input.title as string} (migrated from v1)`,
    });

    const result = recoverProjectRecord(
      validRawProject({ schemaVersion: 0, title: "Original" }),
      2,
      { 0: v0ToV1, 1: v1ToV2 },
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.project.title).toBe(
        "Original (migrated from v0) (migrated from v1)",
      );
      expect(result.project.schemaVersion).toBe(2);
    }
  });

  it("defaults a missing trusted field to true for pre-existing records", () => {
    const result = recoverProjectRecord(validRawProject(), 1, {});

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.project.trusted).toBe(true);
    }
  });

  it("preserves an explicit trusted: false value", () => {
    const result = recoverProjectRecord(
      validRawProject({ trusted: false }),
      1,
      {},
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.project.trusted).toBe(false);
    }
  });

  it("never throws on arbitrary garbage input", () => {
    expect(() => recoverProjectRecord(undefined)).not.toThrow();
    expect(() => recoverProjectRecord(42)).not.toThrow();
    expect(() => recoverProjectRecord({ foo: "bar" })).not.toThrow();
  });
});
