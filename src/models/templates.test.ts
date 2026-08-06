import { describe, expect, it } from "vitest";
import { PROJECT_SCHEMA_VERSION } from "./project";
import {
  DEFAULT_STARTER_TEMPLATE_ID,
  PROJECT_TEMPLATES,
  type TemplateId,
} from "./templates";

const TEMPLATE_IDS = Object.keys(PROJECT_TEMPLATES) as TemplateId[];

describe("PROJECT_TEMPLATES", () => {
  it("includes exactly the five required templates", () => {
    expect(TEMPLATE_IDS.sort()).toEqual(
      [
        "empty",
        "basic-html",
        "scss-example",
        "js-interaction",
        "typescript-example",
      ].sort(),
    );
  });

  it("uses basic-html as the default starter template", () => {
    expect(DEFAULT_STARTER_TEMPLATE_ID).toBe("basic-html");
  });

  it.each(TEMPLATE_IDS)("%s produces a valid schema-v1 project", (id) => {
    const project = PROJECT_TEMPLATES[id].create();

    expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(project.id).toBeTruthy();
    expect(project.title).toBeTruthy();
    expect(project.createdAt).toBe(project.updatedAt);
    expect(project.resources).toEqual([]);
  });

  it.each(TEMPLATE_IDS)(
    "%s produces fresh IDs and timestamps across two calls",
    (id) => {
      const first = PROJECT_TEMPLATES[id].create();
      const second = PROJECT_TEMPLATES[id].create();

      expect(first.id).not.toBe(second.id);
    },
  );

  it.each(TEMPLATE_IDS)(
    "%s does not share mutable state across two calls",
    (id) => {
      const first = PROJECT_TEMPLATES[id].create();
      const second = PROJECT_TEMPLATES[id].create();

      expect(first.source).not.toBe(second.source);
      expect(first.resources).not.toBe(second.resources);
      expect(first.settings).not.toBe(second.settings);
    },
  );

  it.each(TEMPLATE_IDS)("%s applies the default settings", (id) => {
    const project = PROJECT_TEMPLATES[id].create();

    expect(project.settings).toEqual({
      autoRun: true,
      previewDebounceMs: 400,
      preserveConsole: false,
    });
  });

  it("empty template has empty source fields", () => {
    const project = PROJECT_TEMPLATES.empty.create();

    expect(project.source.html).toBe("");
    expect(project.source.stylesheet).toBe("");
    expect(project.source.script).toBe("");
  });

  it("scss-example template uses SCSS as the stylesheet language", () => {
    const project = PROJECT_TEMPLATES["scss-example"].create();

    expect(project.source.stylesheetLanguage).toBe("scss");
  });

  it("typescript-example template uses TypeScript in classic execution mode", () => {
    const project = PROJECT_TEMPLATES["typescript-example"].create();

    expect(project.source.scriptLanguage).toBe("typescript");
    expect(project.source.executionMode).toBe("classic");
  });

  it("js-interaction template uses JavaScript", () => {
    const project = PROJECT_TEMPLATES["js-interaction"].create();

    expect(project.source.scriptLanguage).toBe("javascript");
  });
});
