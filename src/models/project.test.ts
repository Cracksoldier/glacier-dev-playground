import { describe, expect, it } from "vitest";
import { nowIso, PROJECT_SCHEMA_VERSION } from "./project";

describe("project schema", () => {
  it("pins the current schema version to 2", () => {
    expect(PROJECT_SCHEMA_VERSION).toBe(2);
  });

  it("nowIso returns an ISO 8601 timestamp", () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
