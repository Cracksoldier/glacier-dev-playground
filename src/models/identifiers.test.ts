import { describe, expect, it } from "vitest";
import { createCompilationId, createExecutionId } from "./identifiers";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("identifiers", () => {
  it("createCompilationId returns unique UUID-shaped strings", () => {
    const a = createCompilationId();
    const b = createCompilationId();

    expect(a).toMatch(UUID_PATTERN);
    expect(b).toMatch(UUID_PATTERN);
    expect(a).not.toBe(b);
  });

  it("createExecutionId returns unique UUID-shaped strings", () => {
    const a = createExecutionId();
    const b = createExecutionId();

    expect(a).toMatch(UUID_PATTERN);
    expect(b).toMatch(UUID_PATTERN);
    expect(a).not.toBe(b);
  });
});
