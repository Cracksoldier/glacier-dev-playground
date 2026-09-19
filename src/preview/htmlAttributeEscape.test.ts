import { describe, expect, it } from "vitest";
import { escapeHtmlAttribute } from "./htmlAttributeEscape";

describe("escapeHtmlAttribute", () => {
  it("escapes ampersands", () => {
    expect(escapeHtmlAttribute("a&b")).toBe("a&amp;b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtmlAttribute('say "hi"')).toBe("say &quot;hi&quot;");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtmlAttribute("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes ampersands before other entities to avoid double-escaping", () => {
    expect(escapeHtmlAttribute("&quot;")).toBe("&amp;quot;");
  });

  it("leaves an already-safe string unchanged", () => {
    expect(escapeHtmlAttribute("https://example.com/a.js?x=1")).toBe(
      "https://example.com/a.js?x=1",
    );
  });
});
