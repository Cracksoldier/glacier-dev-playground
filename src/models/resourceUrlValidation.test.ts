import { describe, expect, it } from "vitest";
import { validateResourceUrl } from "./resourceUrlValidation";

describe("validateResourceUrl", () => {
  it("accepts an https URL in production", () => {
    expect(validateResourceUrl("https://example.com/lib.js", false)).toEqual({
      valid: true,
    });
  });

  it("accepts an https URL in dev", () => {
    expect(validateResourceUrl("https://example.com/lib.js", true)).toEqual({
      valid: true,
    });
  });

  it("rejects an http URL in production", () => {
    const result = validateResourceUrl("http://example.com/lib.js", false);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/local development/i);
    }
  });

  it("accepts an http URL in dev with a warning", () => {
    const result = validateResourceUrl("http://example.com/lib.js", true);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warning).toMatch(/local development/i);
    }
  });

  it.each([
    "javascript:alert(1)",
    "data:text/plain,hi",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
  ])("rejects %s regardless of environment", (candidate) => {
    expect(validateResourceUrl(candidate, false).valid).toBe(false);
    expect(validateResourceUrl(candidate, true).valid).toBe(false);
  });

  it("rejects a bare specifier", () => {
    const result = validateResourceUrl("lodash", false);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/absolute URL/i);
    }
  });

  it("rejects a relative URL", () => {
    expect(validateResourceUrl("./lib.js", false).valid).toBe(false);
    expect(validateResourceUrl("../lib.js", false).valid).toBe(false);
    expect(validateResourceUrl("/lib.js", false).valid).toBe(false);
  });

  it("rejects an empty or whitespace-only string", () => {
    expect(validateResourceUrl("", false).valid).toBe(false);
    expect(validateResourceUrl("   ", false).valid).toBe(false);
  });
});
