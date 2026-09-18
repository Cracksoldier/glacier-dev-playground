import { describe, expect, it } from "vitest";
import type { ProjectSource } from "../models/project";
import {
  buildPreviewDocument,
  computePreviewLineOffsets,
} from "./previewDocument";

function makeSource(overrides: Partial<ProjectSource> = {}): ProjectSource {
  return {
    html: "<p>hello</p>",
    stylesheet: "p { color: red; }",
    stylesheetLanguage: "css",
    script: 'console.log("hi");',
    scriptLanguage: "javascript",
    executionMode: "classic",
    headContent: '<meta name="test" content="head">',
    ...overrides,
  };
}

describe("buildPreviewDocument", () => {
  it("orders sections: doctype, head metadata, headContent, style, body html, bridge script, script", () => {
    const document = buildPreviewDocument(makeSource(), "execution-1");

    const doctypeIndex = document.indexOf("<!DOCTYPE html>");
    const charsetIndex = document.indexOf('meta charset="UTF-8"');
    const viewportIndex = document.indexOf("viewport");
    const headContentIndex = document.indexOf('name="test" content="head"');
    const styleIndex = document.indexOf("<style>");
    const bodyHtmlIndex = document.indexOf("<p>hello</p>");
    const bridgeIndex = document.indexOf("glacier-dev-playground-preview");
    const scriptIndex = document.lastIndexOf("<script>");
    const scriptContentIndex = document.indexOf('console.log("hi")');

    expect(doctypeIndex).toBe(0);
    expect(charsetIndex).toBeGreaterThan(doctypeIndex);
    expect(viewportIndex).toBeGreaterThan(charsetIndex);
    expect(headContentIndex).toBeGreaterThan(viewportIndex);
    expect(styleIndex).toBeGreaterThan(headContentIndex);
    expect(bodyHtmlIndex).toBeGreaterThan(styleIndex);
    expect(bridgeIndex).toBeGreaterThan(bodyHtmlIndex);
    expect(scriptIndex).toBeGreaterThan(bridgeIndex);
    expect(scriptContentIndex).toBeGreaterThan(scriptIndex);
  });

  it("embeds the given execution ID into the bridge script", () => {
    const document = buildPreviewDocument(makeSource(), "execution-xyz");
    expect(document).toContain("execution-xyz");
  });

  it("uses a classic script tag for classic execution mode", () => {
    const document = buildPreviewDocument(
      makeSource({ executionMode: "classic" }),
      "execution-1",
    );
    // The bridge's own <script> is always classic; only the user script tag
    // (the last one in the document) should vary with executionMode.
    expect(document.endsWith("</script>\n</body>\n</html>")).toBe(true);
    const scriptTags = document.match(/<script[^>]*>/g) ?? [];
    expect(scriptTags[scriptTags.length - 1]).toBe("<script>");
  });

  it("uses a module script tag for module execution mode", () => {
    const document = buildPreviewDocument(
      makeSource({ executionMode: "module" }),
      "execution-1",
    );
    const scriptTags = document.match(/<script[^>]*>/g) ?? [];
    expect(scriptTags[scriptTags.length - 1]).toBe('<script type="module">');
  });

  it("escapes a closing </style> sequence embedded in the stylesheet", () => {
    const document = buildPreviewDocument(
      makeSource({ stylesheet: "content: '</style>';" }),
      "execution-1",
    );
    expect(document).toContain("content: '<\\/style>';");
    expect(document).not.toContain("content: '</style>';");
  });

  it("escapes a closing </script> sequence embedded in the script", () => {
    const document = buildPreviewDocument(
      makeSource({ script: "const s = '</script>';" }),
      "execution-1",
    );
    expect(document).toContain("const s = '<\\/script>';");
    expect(document).not.toContain("const s = '</script>';");
  });

  it("injects SCSS/TypeScript source verbatim without branching on language", () => {
    const document = buildPreviewDocument(
      makeSource({
        stylesheetLanguage: "scss",
        stylesheet: "$accent: red; .card { color: $accent; }",
        scriptLanguage: "typescript",
        script: "const x: number = 1;",
      }),
      "execution-1",
    );
    expect(document).toContain("$accent: red; .card { color: $accent; }");
    expect(document).toContain("const x: number = 1;");
  });
});

describe("computePreviewLineOffsets", () => {
  function lineAt(document: string, oneIndexedLine: number): string {
    return document.split("\n")[oneIndexedLine - 1];
  }

  it("points each range's start at the first line of its actual block", () => {
    const source = makeSource();
    const document = buildPreviewDocument(source, "execution-1");
    const offsets = computePreviewLineOffsets(source);

    expect(lineAt(document, offsets.style.start)).toBe(source.stylesheet);
    expect(lineAt(document, offsets.html.start)).toBe(source.html);
    expect(lineAt(document, offsets.script.start)).toBe(source.script);
  });

  it("points each range's end at the last line of its actual block", () => {
    const source = makeSource({
      stylesheet: "p {\n  color: red;\n}",
      html: "<p>a</p>\n<p>b</p>",
      script: "const a = 1;\nconst b = 2;",
    });
    const document = buildPreviewDocument(source, "execution-1");
    const offsets = computePreviewLineOffsets(source);

    expect(lineAt(document, offsets.style.end)).toBe("}");
    expect(lineAt(document, offsets.html.end)).toBe("<p>b</p>");
    expect(lineAt(document, offsets.script.end)).toBe("const b = 2;");
  });

  it("shifts later offsets when headContent spans multiple lines", () => {
    const singleLine = makeSource({ headContent: "<meta>" });
    const multiLine = makeSource({
      headContent: "<meta>\n<meta>\n<meta>",
    });

    const singleOffsets = computePreviewLineOffsets(singleLine);
    const multiOffsets = computePreviewLineOffsets(multiLine);

    expect(multiOffsets.style.start).toBe(singleOffsets.style.start + 2);
    expect(multiOffsets.html.start).toBe(singleOffsets.html.start + 2);
    expect(multiOffsets.script.start).toBe(singleOffsets.script.start + 2);
  });

  it("shifts the html and script offsets when the stylesheet spans multiple lines", () => {
    const singleLine = makeSource({ stylesheet: "p { color: red; }" });
    const multiLine = makeSource({
      stylesheet: "p {\n  color: red;\n}",
    });

    const singleOffsets = computePreviewLineOffsets(singleLine);
    const multiOffsets = computePreviewLineOffsets(multiLine);

    expect(multiOffsets.style.start).toBe(singleOffsets.style.start);
    expect(multiOffsets.html.start).toBe(singleOffsets.html.start + 2);
    expect(multiOffsets.script.start).toBe(singleOffsets.script.start + 2);
  });

  it("is unaffected by which execution ID a real build would use", () => {
    const source = makeSource();
    const offsets = computePreviewLineOffsets(source);
    const document = buildPreviewDocument(source, "totally-different-id");

    expect(lineAt(document, offsets.script.start)).toBe(source.script);
  });
});
