import { describe, expect, it } from "vitest";
import type { ProjectSource } from "../models/project";
import type { ExternalResource } from "../models/resource";
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

function makeResource(
  overrides: Partial<ExternalResource> = {},
): ExternalResource {
  return {
    id: "resource-1",
    name: "Example",
    url: "https://example.com/a.css",
    type: "stylesheet",
    enabled: true,
    order: 0,
    ...overrides,
  };
}

describe("buildPreviewDocument", () => {
  it("orders sections: doctype, head metadata, headContent, style, body html, inert script placeholder, bridge+loader script", () => {
    const document = buildPreviewDocument(makeSource(), "execution-1", []);

    const doctypeIndex = document.indexOf("<!DOCTYPE html>");
    const charsetIndex = document.indexOf('meta charset="UTF-8"');
    const viewportIndex = document.indexOf("viewport");
    const headContentIndex = document.indexOf('name="test" content="head"');
    const styleIndex = document.indexOf("<style>");
    const bodyHtmlIndex = document.indexOf("<p>hello</p>");
    const placeholderIndex = document.indexOf("data-glacier-user-script");
    const scriptContentIndex = document.indexOf('console.log("hi")');
    const bridgeIndex = document.indexOf("glacier-dev-playground-preview");

    expect(doctypeIndex).toBe(0);
    expect(charsetIndex).toBeGreaterThan(doctypeIndex);
    expect(viewportIndex).toBeGreaterThan(charsetIndex);
    expect(headContentIndex).toBeGreaterThan(viewportIndex);
    expect(styleIndex).toBeGreaterThan(headContentIndex);
    expect(bodyHtmlIndex).toBeGreaterThan(styleIndex);
    expect(placeholderIndex).toBeGreaterThan(bodyHtmlIndex);
    expect(scriptContentIndex).toBeGreaterThan(placeholderIndex);
    expect(bridgeIndex).toBeGreaterThan(scriptContentIndex);
  });

  it("embeds the given execution ID into the bridge script", () => {
    const document = buildPreviewDocument(makeSource(), "execution-xyz", []);
    expect(document).toContain("execution-xyz");
  });

  it("emits the user script as an inert, non-executing placeholder regardless of execution mode", () => {
    const classicDocument = buildPreviewDocument(
      makeSource({ executionMode: "classic" }),
      "execution-1",
      [],
    );
    const moduleDocument = buildPreviewDocument(
      makeSource({ executionMode: "module" }),
      "execution-1",
      [],
    );

    expect(classicDocument).toContain(
      '<script type="text/plain" data-glacier-user-script>',
    );
    expect(moduleDocument).toContain(
      '<script type="text/plain" data-glacier-user-script>',
    );
  });

  it("threads the execution mode into the loader script so it knows how to run the user script", () => {
    const classicDocument = buildPreviewDocument(
      makeSource({ executionMode: "classic" }),
      "execution-1",
      [],
    );
    const moduleDocument = buildPreviewDocument(
      makeSource({ executionMode: "module" }),
      "execution-1",
      [],
    );

    expect(classicDocument).toContain('"classic"');
    expect(moduleDocument).toContain('"module"');
  });

  it("escapes a closing </style> sequence embedded in the stylesheet", () => {
    const document = buildPreviewDocument(
      makeSource({ stylesheet: "content: '</style>';" }),
      "execution-1",
      [],
    );
    expect(document).toContain("content: '<\\/style>';");
    expect(document).not.toContain("content: '</style>';");
  });

  it("escapes a closing </script> sequence embedded in the script", () => {
    const document = buildPreviewDocument(
      makeSource({ script: "const s = '</script>';" }),
      "execution-1",
      [],
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
      [],
    );
    expect(document).toContain("$accent: red; .card { color: $accent; }");
    expect(document).toContain("const x: number = 1;");
  });

  it("renders an enabled stylesheet resource as a <link> tag before the user stylesheet", () => {
    const document = buildPreviewDocument(makeSource(), "execution-1", [
      makeResource({ url: "https://example.com/a.css" }),
    ]);

    const linkIndex = document.indexOf(
      '<link rel="stylesheet" href="https://example.com/a.css">',
    );
    const styleIndex = document.indexOf("<style>");

    expect(linkIndex).toBeGreaterThanOrEqual(0);
    expect(linkIndex).toBeLessThan(styleIndex);
  });

  it("includes integrity and crossorigin attributes on a stylesheet resource when present", () => {
    const document = buildPreviewDocument(makeSource(), "execution-1", [
      makeResource({
        url: "https://example.com/a.css",
        integrity: "sha384-abc",
        crossOrigin: "anonymous",
      }),
    ]);

    expect(document).toContain('integrity="sha384-abc"');
    expect(document).toContain('crossorigin="anonymous"');
  });

  it("html-attribute-escapes a stylesheet resource's URL", () => {
    const document = buildPreviewDocument(makeSource(), "execution-1", [
      makeResource({ url: 'https://example.com/a.css?x="y"' }),
    ]);

    expect(document).toContain(
      'href="https://example.com/a.css?x=&quot;y&quot;"',
    );
    expect(document).not.toContain('href="https://example.com/a.css?x="y""');
  });

  it("omits a disabled stylesheet resource's <link> tag", () => {
    const document = buildPreviewDocument(makeSource(), "execution-1", [
      makeResource({ url: "https://example.com/disabled.css", enabled: false }),
    ]);

    expect(document).not.toContain("https://example.com/disabled.css");
  });

  it("does not render script/module resources as static tags (the loader creates them dynamically)", () => {
    const document = buildPreviewDocument(makeSource(), "execution-1", [
      makeResource({
        id: "script-1",
        url: "https://example.com/a.js",
        type: "script",
      }),
    ]);

    expect(document).not.toContain("<script src=");
    expect(document).toContain("https://example.com/a.js");
  });
});

describe("computePreviewLineOffsets", () => {
  function lineAt(document: string, oneIndexedLine: number): string {
    return document.split("\n")[oneIndexedLine - 1];
  }

  it("points each range's start at the first line of its actual block", () => {
    const source = makeSource();
    const document = buildPreviewDocument(source, "execution-1", []);
    const offsets = computePreviewLineOffsets(source, []);

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
    const document = buildPreviewDocument(source, "execution-1", []);
    const offsets = computePreviewLineOffsets(source, []);

    expect(lineAt(document, offsets.style.end)).toBe("}");
    expect(lineAt(document, offsets.html.end)).toBe("<p>b</p>");
    expect(lineAt(document, offsets.script.end)).toBe("const b = 2;");
  });

  it("shifts later offsets when headContent spans multiple lines", () => {
    const singleLine = makeSource({ headContent: "<meta>" });
    const multiLine = makeSource({
      headContent: "<meta>\n<meta>\n<meta>",
    });

    const singleOffsets = computePreviewLineOffsets(singleLine, []);
    const multiOffsets = computePreviewLineOffsets(multiLine, []);

    expect(multiOffsets.style.start).toBe(singleOffsets.style.start + 2);
    expect(multiOffsets.html.start).toBe(singleOffsets.html.start + 2);
    expect(multiOffsets.script.start).toBe(singleOffsets.script.start + 2);
  });

  it("shifts the html and script offsets when the stylesheet spans multiple lines", () => {
    const singleLine = makeSource({ stylesheet: "p { color: red; }" });
    const multiLine = makeSource({
      stylesheet: "p {\n  color: red;\n}",
    });

    const singleOffsets = computePreviewLineOffsets(singleLine, []);
    const multiOffsets = computePreviewLineOffsets(multiLine, []);

    expect(multiOffsets.style.start).toBe(singleOffsets.style.start);
    expect(multiOffsets.html.start).toBe(singleOffsets.html.start + 2);
    expect(multiOffsets.script.start).toBe(singleOffsets.script.start + 2);
  });

  it("shifts every tracked offset by one line per enabled stylesheet resource", () => {
    const source = makeSource();
    const withoutResources = computePreviewLineOffsets(source, []);
    const withOneResource = computePreviewLineOffsets(source, [
      makeResource({ url: "https://example.com/a.css" }),
    ]);

    expect(withOneResource.style.start).toBe(withoutResources.style.start + 1);
    expect(withOneResource.html.start).toBe(withoutResources.html.start + 1);
    expect(withOneResource.script.start).toBe(
      withoutResources.script.start + 1,
    );
  });

  it("does not shift offsets for a disabled stylesheet resource", () => {
    const source = makeSource();
    const withoutResources = computePreviewLineOffsets(source, []);
    const withDisabledResource = computePreviewLineOffsets(source, [
      makeResource({ url: "https://example.com/a.css", enabled: false }),
    ]);

    expect(withDisabledResource.style.start).toBe(withoutResources.style.start);
  });

  it("does not shift offsets for script/module resources (they are not static tags)", () => {
    const source = makeSource();
    const withoutResources = computePreviewLineOffsets(source, []);
    const withScriptResource = computePreviewLineOffsets(source, [
      makeResource({
        id: "script-1",
        url: "https://example.com/a.js",
        type: "script",
      }),
    ]);

    expect(withScriptResource.style.start).toBe(withoutResources.style.start);
  });

  it("is unaffected by which execution ID a real build would use", () => {
    const source = makeSource();
    const offsets = computePreviewLineOffsets(source, []);
    const document = buildPreviewDocument(source, "totally-different-id", []);

    expect(lineAt(document, offsets.script.start)).toBe(source.script);
  });
});
