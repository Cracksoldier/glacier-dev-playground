import ts from "typescript";
import { describe, expect, it } from "vitest";
import { decodeOutputLineToSourceLine } from "./sourceMapLineMapping";

/**
 * Transpiles `source` with a source map and returns emitted output lines
 * paired 1:1 with their decoded source-line mapping. `transpileModule`
 * always prepends a `"use strict";` prologue line (unmapped — decodes to
 * `undefined`) and appends a `//# sourceMappingURL=...` comment line; both
 * are stripped here so callers only see real code lines and their mappings.
 */
function transpileWithMap(source: string): {
  outputLines: string[];
  lineMap: (number | undefined)[];
} {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      sourceMap: true,
    },
  });
  const mapText = result.sourceMapText;
  if (mapText === undefined) {
    throw new Error("Expected transpileModule to emit a source map.");
  }

  const rawLines = result.outputText
    .replace(/\n\/\/# sourceMappingURL=.*$/, "")
    .split("\n");
  const rawLineMap = decodeOutputLineToSourceLine(mapText);
  expect(rawLines[0]).toBe('"use strict";');
  expect(rawLineMap[0]).toBeUndefined();

  return { outputLines: rawLines.slice(1), lineMap: rawLineMap.slice(1) };
}

describe("decodeOutputLineToSourceLine", () => {
  it("maps a 1:1 line-count file identically", () => {
    const source = ["const a = 1;", "const b = 2;", "const c = a + b;"].join(
      "\n",
    );
    const { outputLines, lineMap } = transpileWithMap(source);
    expect(outputLines).toHaveLength(3);
    expect(lineMap[0]).toBe(1);
    expect(lineMap[1]).toBe(2);
    expect(lineMap[2]).toBe(3);
  });

  it("maps output lines back to earlier source lines when an interface is erased", () => {
    const source = [
      "interface Point {",
      "  x: number;",
      "  y: number;",
      "}",
      "",
      "const origin: Point = { x: 0, y: 0 };",
      "console.log(origin);",
    ].join("\n");
    const { outputLines, lineMap } = transpileWithMap(source);
    // The interface (source lines 1-4) and blank line 5 erase entirely —
    // emitted output starts directly with the const declaration.
    expect(outputLines).toEqual([
      "const origin = { x: 0, y: 0 };",
      "console.log(origin);",
    ]);
    expect(lineMap[0]).toBe(6);
    expect(lineMap[1]).toBe(7);
  });

  it("maps output lines back to earlier source lines when an enum shifts them", () => {
    const source = [
      "enum Color { Red, Green, Blue }",
      "const favorite = Color.Blue;",
    ].join("\n");
    const { outputLines, lineMap } = transpileWithMap(source);
    // The enum expands into several emitted lines (an IIFE), so the
    // `const favorite` statement lands well past its original source line.
    expect(outputLines.length).toBeGreaterThan(2);
    const lastLineSourceLine = lineMap[lineMap.length - 1];
    expect(lastLineSourceLine).toBe(2);
  });

  it("maps output lines back to earlier source lines when constructor parameter properties expand", () => {
    const source = [
      "class Vector {",
      "  constructor(public x: number, public y: number) {}",
      "}",
      "const v = new Vector(1, 2);",
    ].join("\n");
    const { lineMap } = transpileWithMap(source);
    // Parameter-property assignments are synthesized inside the
    // constructor body, expanding source line 2 into multiple output
    // lines that all still map back to source line 2.
    expect(lineMap.filter((line) => line === 2).length).toBeGreaterThan(1);
  });

  it("returns an empty array for a map with no mappings field", () => {
    expect(
      decodeOutputLineToSourceLine(JSON.stringify({ version: 3 })),
    ).toEqual([]);
  });

  it("returns undefined for an output line with no mapping segments", () => {
    const map = { version: 3, mappings: "AAAA;;AACA" };
    const lineMap = decodeOutputLineToSourceLine(JSON.stringify(map));
    expect(lineMap).toEqual([1, undefined, 2]);
  });
});
