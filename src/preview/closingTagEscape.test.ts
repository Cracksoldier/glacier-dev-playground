import { describe, expect, it } from "vitest";
import { escapeClosingSequence } from "./closingTagEscape";

describe("escapeClosingSequence", () => {
  it("escapes a closing </script> sequence", () => {
    expect(escapeClosingSequence("const s = '</script>';", "script")).toBe(
      "const s = '<\\/script>';",
    );
  });

  it("escapes a closing </style> sequence", () => {
    expect(escapeClosingSequence("content: '</style>';", "style")).toBe(
      "content: '<\\/style>';",
    );
  });

  it("is case-insensitive", () => {
    expect(escapeClosingSequence("</SCRIPT>", "script")).toBe("<\\/SCRIPT>");
  });

  it("escapes multiple occurrences", () => {
    expect(escapeClosingSequence("</script></script>", "script")).toBe(
      "<\\/script><\\/script>",
    );
  });

  it("does not escape an unrelated closing tag", () => {
    expect(escapeClosingSequence("</style>", "script")).toBe("</style>");
  });

  it("leaves source with no closing sequence unchanged", () => {
    expect(escapeClosingSequence("const a = 1;", "script")).toBe(
      "const a = 1;",
    );
  });
});
