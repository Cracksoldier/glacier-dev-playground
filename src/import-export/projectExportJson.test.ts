import { describe, expect, it } from "vitest";
import type { PlaygroundProject } from "../models/project";
import { serializeProjectForExport } from "./projectExportJson";

function testProject(
  overrides: Partial<PlaygroundProject> = {},
): PlaygroundProject {
  return {
    schemaVersion: 1,
    id: "project-id",
    title: "My Project",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    trusted: true,
    source: {
      html: "<p>hi</p>",
      stylesheet: "p { color: red; }",
      stylesheetLanguage: "css",
      script: "console.log(1);",
      scriptLanguage: "javascript",
      executionMode: "classic",
      headContent: "",
    },
    resources: [
      {
        id: "res-1",
        name: "Lodash",
        url: "https://example.com/lodash.js",
        type: "script",
        enabled: true,
        order: 0,
      },
    ],
    settings: {
      autoRun: true,
      previewDebounceMs: 400,
      preserveConsole: false,
    },
    ...overrides,
  };
}

describe("serializeProjectForExport", () => {
  it("produces pretty-printed JSON containing the portable fields", () => {
    const project = testProject();

    const json = serializeProjectForExport(project);
    const parsed = JSON.parse(json);

    expect(json).toContain("\n");
    expect(parsed).toEqual({
      schemaVersion: 1,
      title: "My Project",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      source: project.source,
      resources: project.resources,
      settings: project.settings,
    });
  });

  it("omits the local-only id field", () => {
    const json = serializeProjectForExport(testProject());
    expect(JSON.parse(json)).not.toHaveProperty("id");
  });

  it("omits the trusted field regardless of its value", () => {
    const trustedJson = serializeProjectForExport(
      testProject({ trusted: true }),
    );
    const untrustedJson = serializeProjectForExport(
      testProject({ trusted: false }),
    );

    expect(JSON.parse(trustedJson)).not.toHaveProperty("trusted");
    expect(JSON.parse(untrustedJson)).not.toHaveProperty("trusted");
  });

  it("preserves uncompiled scss/typescript source verbatim, not compiled output", () => {
    const project = testProject({
      source: {
        html: "<p>hi</p>",
        stylesheet: "$c: red; p { color: $c; }",
        stylesheetLanguage: "scss",
        script: "const a: number = 1;",
        scriptLanguage: "typescript",
        executionMode: "module",
        headContent: "",
      },
    });

    const json = serializeProjectForExport(project);
    const parsed = JSON.parse(json);

    expect(parsed.source.stylesheet).toBe("$c: red; p { color: $c; }");
    expect(parsed.source.script).toBe("const a: number = 1;");
  });

  it("includes all resources verbatim", () => {
    const project = testProject({
      resources: [
        {
          id: "res-1",
          name: "Font",
          url: "https://example.com/font.css",
          type: "font-stylesheet",
          enabled: false,
          order: 2,
          integrity: "sha384-abc",
          crossOrigin: "anonymous",
        },
      ],
    });

    const json = serializeProjectForExport(project);
    expect(JSON.parse(json).resources).toEqual(project.resources);
  });
});
