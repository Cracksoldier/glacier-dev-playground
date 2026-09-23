import { describe, expect, it } from "vitest";
import { compileScript } from "./tsCompiler";

describe("compileScript", () => {
  it("compiles valid TypeScript with no diagnostics", () => {
    const result = compileScript("const a: number = 1;\nconst b = a + 1;", {
      scriptLanguage: "typescript",
      executionMode: "classic",
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.emittedJs).toContain("const a = 1;");
    expect(result.emittedJs).toContain("const b = a + 1;");
  });

  it("resolves DOM types cleanly", () => {
    const result = compileScript(
      'const el: HTMLDivElement = document.createElement("div");\nel.addEventListener("click", () => {});',
      { scriptLanguage: "typescript", executionMode: "classic" },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.emittedJs).not.toBeNull();
  });

  it("reports a syntactic diagnostic with a 1-indexed line/column for malformed TS", () => {
    const result = compileScript("const a: number = ;", {
      scriptLanguage: "typescript",
      executionMode: "classic",
    });
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].line).toBe(1);
    expect(errors[0].column).toBeGreaterThanOrEqual(1);
    expect(result.emittedJs).toBeNull();
  });

  it("reports a semantic diagnostic (type mismatch) with correct line/column", () => {
    const result = compileScript(
      "const a: number = 1;\nconst b: string = a;\nconsole.log(b);",
      { scriptLanguage: "typescript", executionMode: "classic" },
    );
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.line === 2)).toBe(true);
    expect(result.emittedJs).toBeNull();
  });

  it("does not run semantic checking on plain JS (checkJs: false)", () => {
    const result = compileScript("const a: number = 1;", {
      scriptLanguage: "javascript",
      executionMode: "classic",
    });
    // A TS type annotation is a syntax error in plain JS — this exercises
    // syntactic diagnostics still firing for JS, not semantic ones.
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("reports no diagnostics for valid classic-mode JS with no type annotations", () => {
    const result = compileScript(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: authored JS source text under test, not a real template literal in this file.
      "function greet(name) { return `Hi ${name}`; }\nconsole.log(greet('a'));",
      { scriptLanguage: "javascript", executionMode: "classic" },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.emittedJs).not.toBeNull();
  });

  it("rejects a top-level import in classic mode for TypeScript", () => {
    const result = compileScript('import x from "https://esm.sh/x";', {
      scriptLanguage: "typescript",
      executionMode: "classic",
    });
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("classic script mode");
    expect(errors[0].line).toBe(1);
    expect(result.emittedJs).toBeNull();
  });

  it("rejects a top-level export in classic mode for JavaScript", () => {
    const result = compileScript("export const a = 1;", {
      scriptLanguage: "javascript",
      executionMode: "classic",
    });
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("classic script mode");
  });

  it("allows and preserves import/export syntax in module mode", () => {
    const result = compileScript(
      'import x from "https://esm.sh/x";\nexport const y = x;',
      { scriptLanguage: "typescript", executionMode: "module" },
    );
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors).toEqual([]);
    expect(result.emittedJs).toContain('from "https://esm.sh/x"');
    expect(result.emittedJs).toContain("export const y = x;");
  });

  it("allows top-level await in module mode even without any import/export", () => {
    const result = compileScript(
      "const value: number = await Promise.resolve(1);\nconsole.log(value);",
      { scriptLanguage: "typescript", executionMode: "module" },
    );
    expect(result.diagnostics.filter((d) => d.category === "error")).toEqual(
      [],
    );
    expect(result.emittedJs).toContain("await Promise.resolve(1)");
  });

  it("still blocks top-level await in classic mode", () => {
    const result = compileScript(
      "const value: number = await Promise.resolve(1);",
      { scriptLanguage: "typescript", executionMode: "classic" },
    );
    expect(result.diagnostics.some((d) => d.category === "error")).toBe(true);
    expect(result.emittedJs).toBeNull();
  });

  it("treats an absolute HTTPS import as untyped any with a non-blocking warning, not an error", () => {
    const result = compileScript(
      'import x from "https://esm.sh/lodash";\nconst n: number = x.whatever.deeply.nested;',
      { scriptLanguage: "typescript", executionMode: "module" },
    );
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors).toEqual([]);
    const warnings = result.diagnostics.filter((d) => d.category === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("https://esm.sh/lodash");
    expect(warnings[0].message).toContain("any");
    expect(result.emittedJs).not.toBeNull();
  });

  it("produces exactly one remote-import warning even when the same specifier is imported twice", () => {
    const result = compileScript(
      'import a from "https://esm.sh/x";\nimport { b } from "https://esm.sh/x";',
      { scriptLanguage: "typescript", executionMode: "module" },
    );
    const warnings = result.diagnostics.filter((d) => d.category === "warning");
    expect(warnings).toHaveLength(1);
  });

  it("blocks a bare-specifier import with a real TS2307 diagnostic", () => {
    const result = compileScript('import { x } from "lodash";', {
      scriptLanguage: "typescript",
      executionMode: "module",
    });
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes("Cannot find module"))).toBe(
      true,
    );
    expect(result.emittedJs).toBeNull();
  });

  it("blocks a relative-specifier import with a real TS2307 diagnostic", () => {
    const result = compileScript('import { x } from "./utils";', {
      scriptLanguage: "typescript",
      executionMode: "module",
    });
    const errors = result.diagnostics.filter((d) => d.category === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes("Cannot find module"))).toBe(
      true,
    );
    expect(result.emittedJs).toBeNull();
  });

  it("does not populate a line map for JS-mode successful compiles", () => {
    const result = compileScript("const a = 1;", {
      scriptLanguage: "javascript",
      executionMode: "classic",
    });
    expect(result.lineMap).toBeNull();
  });

  it("populates a decoded line map for a TS-mode successful compile", () => {
    const result = compileScript(
      "interface Point { x: number; y: number; }\nconst p: Point = { x: 1, y: 2 };\nconsole.log(p);",
      { scriptLanguage: "typescript", executionMode: "classic" },
    );
    expect(result.lineMap).not.toBeNull();
    expect(result.lineMap).toContain(2);
  });
});
