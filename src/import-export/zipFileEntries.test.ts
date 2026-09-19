import { describe, expect, it } from "vitest";
import type { ProjectSource } from "../models/project";
import { buildZipFileEntries } from "./zipFileEntries";

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function source(overrides: Partial<ProjectSource> = {}): ProjectSource {
  return {
    html: "<p>hi</p>",
    stylesheet: "p { color: red; }",
    stylesheetLanguage: "css",
    script: "console.log(1);",
    scriptLanguage: "javascript",
    executionMode: "classic",
    headContent: "",
    ...overrides,
  };
}

describe("buildZipFileEntries", () => {
  it("always includes index.html, style.css, script.js with the resolved (compiled) content", () => {
    const resolved = source({
      stylesheet: ".compiled { color: blue; }",
      script: "var compiled = true;",
    });
    const original = source();

    const entries = buildZipFileEntries(resolved, original, []);

    expect(Object.keys(entries).sort()).toEqual([
      "index.html",
      "script.js",
      "style.css",
    ]);
    expect(decode(entries["style.css"])).toBe(".compiled { color: blue; }");
    expect(decode(entries["script.js"])).toBe("var compiled = true;");
    expect(decode(entries["index.html"])).toContain(
      '<link rel="stylesheet" href="style.css">',
    );
  });

  it("includes src/style.scss with the original source when stylesheetLanguage is scss", () => {
    const resolved = source({ stylesheet: ".compiled {}" });
    const original = source({
      stylesheetLanguage: "scss",
      stylesheet: "$c: blue; .a { color: $c; }",
    });

    const entries = buildZipFileEntries(resolved, original, []);

    expect(decode(entries["src/style.scss"])).toBe(
      "$c: blue; .a { color: $c; }",
    );
    expect(entries["src/script.ts"]).toBeUndefined();
  });

  it("includes src/script.ts with the original source when scriptLanguage is typescript", () => {
    const resolved = source({ script: "var b = 2;" });
    const original = source({
      scriptLanguage: "typescript",
      script: "const b: number = 2;",
    });

    const entries = buildZipFileEntries(resolved, original, []);

    expect(decode(entries["src/script.ts"])).toBe("const b: number = 2;");
    expect(entries["src/style.scss"]).toBeUndefined();
  });

  it("includes both src/style.scss and src/script.ts when both are scss+typescript", () => {
    const resolved = source({
      stylesheet: ".compiled {}",
      script: "var b = 2;",
    });
    const original = source({
      stylesheetLanguage: "scss",
      stylesheet: "$c: red;",
      scriptLanguage: "typescript",
      script: "const b: number = 2;",
    });

    const entries = buildZipFileEntries(resolved, original, []);

    expect(Object.keys(entries).sort()).toEqual([
      "index.html",
      "script.js",
      "src/script.ts",
      "src/style.scss",
      "style.css",
    ]);
  });

  it("includes neither src file when both css and javascript", () => {
    const entries = buildZipFileEntries(source(), source(), []);

    expect(entries["src/style.scss"]).toBeUndefined();
    expect(entries["src/script.ts"]).toBeUndefined();
  });
});
