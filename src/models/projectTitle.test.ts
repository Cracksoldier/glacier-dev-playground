import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_TITLE,
  normalizeProjectTitle,
  PROJECT_TITLE_MAX_LENGTH,
} from "./projectTitle";

describe("normalizeProjectTitle", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeProjectTitle("  My Project  ")).toBe("My Project");
  });

  it("collapses internal whitespace runs", () => {
    expect(normalizeProjectTitle("My    Project")).toBe("My Project");
  });

  it("falls back to the default title for empty input", () => {
    expect(normalizeProjectTitle("")).toBe(DEFAULT_PROJECT_TITLE);
  });

  it("falls back to the default title for whitespace-only input", () => {
    expect(normalizeProjectTitle("   ")).toBe(DEFAULT_PROJECT_TITLE);
  });

  it("truncates titles longer than the max length", () => {
    const longTitle = "x".repeat(PROJECT_TITLE_MAX_LENGTH + 20);

    const normalized = normalizeProjectTitle(longTitle);

    expect(normalized).toHaveLength(PROJECT_TITLE_MAX_LENGTH);
  });

  it("does not leave a trailing space when truncation lands after a space", () => {
    const title = `${"x".repeat(PROJECT_TITLE_MAX_LENGTH - 1)} tail`;

    const normalized = normalizeProjectTitle(title);

    expect(normalized).toBe("x".repeat(PROJECT_TITLE_MAX_LENGTH - 1));
  });

  it("never throws", () => {
    expect(() => normalizeProjectTitle("")).not.toThrow();
  });
});
