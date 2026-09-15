import { describe, expect, it } from "vitest";
import type { ProjectSource } from "../models/project";
import { buildPreviewDocument } from "./previewDocument";

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
  it("orders sections: doctype, head metadata, headContent, style, body html, bridge marker, script", () => {
    const document = buildPreviewDocument(makeSource());

    const doctypeIndex = document.indexOf("<!DOCTYPE html>");
    const charsetIndex = document.indexOf('meta charset="UTF-8"');
    const viewportIndex = document.indexOf("viewport");
    const headContentIndex = document.indexOf('name="test" content="head"');
    const styleIndex = document.indexOf("<style>");
    const bodyHtmlIndex = document.indexOf("<p>hello</p>");
    const bridgeIndex = document.indexOf("<!-- glacier-preview-bridge -->");
    const scriptIndex = document.indexOf("<script>");
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

  it("uses a classic script tag for classic execution mode", () => {
    const document = buildPreviewDocument(
      makeSource({ executionMode: "classic" }),
    );
    expect(document).toContain("<script>");
    expect(document).not.toContain('<script type="module">');
  });

  it("uses a module script tag for module execution mode", () => {
    const document = buildPreviewDocument(
      makeSource({ executionMode: "module" }),
    );
    expect(document).toContain('<script type="module">');
  });

  it("escapes a closing </style> sequence embedded in the stylesheet", () => {
    const document = buildPreviewDocument(
      makeSource({ stylesheet: "content: '</style>';" }),
    );
    expect(document).toContain("content: '<\\/style>';");
    expect(document).not.toContain("content: '</style>';");
  });

  it("escapes a closing </script> sequence embedded in the script", () => {
    const document = buildPreviewDocument(
      makeSource({ script: "const s = '</script>';" }),
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
    );
    expect(document).toContain("$accent: red; .card { color: $accent; }");
    expect(document).toContain("const x: number = 1;");
  });
});
