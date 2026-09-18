import { describe, expect, it } from "vitest";
import { compileScss, toScssCompileError } from "./scssCompiler";

describe("compileScss", () => {
  it("compiles variables, nesting, and mixins", async () => {
    const result = await compileScss(`
      $color: #336699;
      @mixin pad($n) { padding: $n; }
      .a {
        color: $color;
        .b { @include pad(4px); }
      }
    `);
    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.css).toContain("color: #336699");
    expect(result.css).toContain(".a .b");
    expect(result.css).toContain("padding: 4px");
  });

  it("compiles functions and built-in Sass modules", async () => {
    const result = await compileScss(`
      @use "sass:math";
      .a { width: #{math.div(10, 2)}px; }
    `);
    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.css).toContain("width: 5px");
  });

  it("returns a structured failure for a syntax error", async () => {
    const result = await compileScss(".a { color: ; }");
    expect(result.type).toBe("failure");
    if (result.type !== "failure") return;
    expect(result.error.message.length).toBeGreaterThan(0);
    expect(result.error.line).toBeGreaterThanOrEqual(1);
    expect(result.error.column).toBeGreaterThanOrEqual(1);
  });

  it("returns a structured failure for an unsupported relative import", async () => {
    const result = await compileScss('@use "./other";\n.a { color: red; }');
    expect(result.type).toBe("failure");
    if (result.type !== "failure") return;
    expect(result.error.message.length).toBeGreaterThan(0);
  });

  it("returns success with empty CSS for empty source", async () => {
    const result = await compileScss("");
    expect(result).toEqual({ type: "success", css: "" });
  });
});

describe("toScssCompileError", () => {
  it("extracts sassMessage and 1-indexed span position from a Sass Exception-like object", () => {
    const error = toScssCompileError({
      sassMessage: "Expected expression.",
      span: { start: { line: 2, column: 4 }, text: "color: ;" },
    });
    expect(error).toEqual({
      message: "Expected expression.",
      line: 3,
      column: 5,
      sourceExcerpt: "color: ;",
    });
  });

  it("falls back to a plain Error's message", () => {
    expect(toScssCompileError(new Error("boom"))).toEqual({
      message: "boom",
    });
  });

  it("falls back to a generic message for a non-Error throw", () => {
    expect(toScssCompileError("not an error")).toEqual({
      message: "SCSS compilation failed.",
    });
  });
});
