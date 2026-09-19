import { describe, expect, it } from "vitest";
import type { ProjectSource } from "../models/project";
import type { ExternalResource } from "../models/resource";
import {
  buildStandaloneHtmlDocument,
  buildZipIndexHtmlDocument,
} from "./standaloneHtmlDocument";

function baseSource(overrides: Partial<ProjectSource> = {}): ProjectSource {
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

function resource(overrides: Partial<ExternalResource> = {}): ExternalResource {
  return {
    id: "res-1",
    name: "Resource",
    url: "https://example.com/a.css",
    type: "stylesheet",
    enabled: true,
    order: 0,
    ...overrides,
  };
}

describe("buildStandaloneHtmlDocument", () => {
  it("inlines the compiled stylesheet and script with no bridge or postMessage code", () => {
    const html = buildStandaloneHtmlDocument(baseSource(), []);

    expect(html).toContain("<style>");
    expect(html).toContain("p { color: red; }");
    expect(html).toContain("<script>");
    expect(html).toContain("console.log(1);");
    expect(html).not.toContain("postMessage");
    expect(html).not.toContain("data-glacier-user-script");
    expect(html).not.toContain("glacier");
  });

  it("emits a type=module script tag for module execution mode", () => {
    const html = buildStandaloneHtmlDocument(
      baseSource({ executionMode: "module" }),
      [],
    );

    expect(html).toContain('<script type="module">');
  });

  it("escapes closing tag sequences in the inlined stylesheet and script", () => {
    const html = buildStandaloneHtmlDocument(
      baseSource({
        stylesheet: "/* </style> */",
        script: "// </script>",
      }),
      [],
    );

    expect(html).not.toContain("</style> */");
    expect(html).not.toContain("</script> ");
    expect(html).toContain("<\\/style>");
    expect(html).toContain("<\\/script>");
  });

  it("includes raw headContent and html verbatim", () => {
    const html = buildStandaloneHtmlDocument(
      baseSource({ headContent: '<meta name="x" content="y">' }),
      [],
    );

    expect(html).toContain('<meta name="x" content="y">');
    expect(html).toContain("<p>hi</p>");
  });

  it("orders enabled stylesheet/font-stylesheet resources by order and escapes attributes", () => {
    const resources: ExternalResource[] = [
      resource({
        id: "res-2",
        url: "https://example.com/b.css",
        order: 1,
        type: "font-stylesheet",
      }),
      resource({
        id: "res-1",
        url: 'https://example.com/a.css?x="y"',
        order: 0,
        type: "stylesheet",
        integrity: "sha384-abc",
        crossOrigin: "anonymous",
      }),
    ];

    const html = buildStandaloneHtmlDocument(baseSource(), resources);
    const firstIndex = html.indexOf("a.css");
    const secondIndex = html.indexOf("b.css");

    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(firstIndex);
    expect(html).toContain("&quot;y&quot;");
    expect(html).toContain('integrity="sha384-abc"');
    expect(html).toContain('crossorigin="anonymous"');
  });

  it("excludes disabled resources", () => {
    const html = buildStandaloneHtmlDocument(baseSource(), [
      resource({ enabled: false }),
    ]);

    expect(html).not.toContain("example.com/a.css");
  });

  it("includes script/module resource tags in order before the user's own script", () => {
    const resources: ExternalResource[] = [
      resource({
        id: "res-1",
        type: "script",
        url: "https://example.com/lib.js",
        order: 0,
      }),
      resource({
        id: "res-2",
        type: "module",
        url: "https://example.com/lib.mjs",
        order: 1,
      }),
    ];

    const html = buildStandaloneHtmlDocument(baseSource(), resources);

    expect(html).toContain('<script src="https://example.com/lib.js">');
    expect(html).toContain(
      '<script type="module" src="https://example.com/lib.mjs">',
    );
    const libIndex = html.indexOf("lib.js");
    const ownScriptIndex = html.indexOf("console.log(1);");
    expect(ownScriptIndex).toBeGreaterThan(libIndex);
  });
});

describe("buildZipIndexHtmlDocument", () => {
  it("links style.css and script.js instead of inlining them", () => {
    const html = buildZipIndexHtmlDocument(baseSource(), []);

    expect(html).toContain('<link rel="stylesheet" href="style.css">');
    expect(html).toContain('<script src="script.js"></script>');
    expect(html).not.toContain("<style>");
    expect(html).not.toContain("p { color: red; }");
    expect(html).not.toContain("console.log(1);");
  });

  it("links script.js as a module when execution mode is module", () => {
    const html = buildZipIndexHtmlDocument(
      baseSource({ executionMode: "module" }),
      [],
    );

    expect(html).toContain('<script type="module" src="script.js"></script>');
  });

  it("still includes external resource link/script tags", () => {
    const resources: ExternalResource[] = [
      resource({ id: "res-1", type: "stylesheet", url: "https://a.com/x.css" }),
    ];

    const html = buildZipIndexHtmlDocument(baseSource(), resources);
    expect(html).toContain('href="https://a.com/x.css"');
  });
});
