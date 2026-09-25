import { indentUnit, language } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  buildLanguageExtensions,
  buildPreferencesExtensions,
} from "./editorExtensions";

describe("buildLanguageExtensions", () => {
  it("maps html to the HTML language", () => {
    const state = EditorState.create({
      extensions: buildLanguageExtensions("html", {}),
    });
    expect(state.facet(language)?.name).toBe("html");
  });

  it("uses the CSS language for css and the SCSS (brace-syntax) language for scss", () => {
    const cssState = EditorState.create({
      extensions: buildLanguageExtensions("css", { stylesheetLanguage: "css" }),
    });
    const scssState = EditorState.create({
      extensions: buildLanguageExtensions("css", {
        stylesheetLanguage: "scss",
      }),
    });
    expect(cssState.facet(language)?.name).toBe("css");
    expect(scssState.facet(language)?.name).toBe("sass");
    expect(
      scssState
        .facet(language)
        ?.parser.parse("$c: red; .a { .b { color: $c; } }")
        .toString(),
    ).not.toContain("⚠");
  });

  it("maps javascript to the JavaScript language", () => {
    const state = EditorState.create({
      extensions: buildLanguageExtensions("javascript", {
        scriptLanguage: "javascript",
      }),
    });
    expect(state.facet(language)?.name).toBe("javascript");
  });

  it("enables the TypeScript dialect when scriptLanguage is typescript", () => {
    const tsState = EditorState.create({
      extensions: buildLanguageExtensions("javascript", {
        scriptLanguage: "typescript",
      }),
    });
    const jsState = EditorState.create({
      extensions: buildLanguageExtensions("javascript", {
        scriptLanguage: "javascript",
      }),
    });

    expect(tsState.facet(language)).not.toBe(jsState.facet(language));
  });
});

describe("buildPreferencesExtensions", () => {
  it("sets indentUnit to match tabWidth spaces", () => {
    const state = EditorState.create({
      extensions: buildPreferencesExtensions({
        fontSize: 14,
        tabWidth: 4,
        wordWrap: false,
        lineNumbers: false,
      }),
    });
    expect(state.facet(indentUnit)).toBe("    ");
  });

  it("sets tabSize to match tabWidth", () => {
    const state = EditorState.create({
      extensions: buildPreferencesExtensions({
        fontSize: 14,
        tabWidth: 2,
        wordWrap: false,
        lineNumbers: false,
      }),
    });
    expect(state.facet(EditorState.tabSize)).toBe(2);
  });

  it("includes more extensions when wordWrap and lineNumbers are enabled", () => {
    const minimal = buildPreferencesExtensions({
      fontSize: 14,
      tabWidth: 2,
      wordWrap: false,
      lineNumbers: false,
    });
    const full = buildPreferencesExtensions({
      fontSize: 14,
      tabWidth: 2,
      wordWrap: true,
      lineNumbers: true,
    });
    expect(full.length).toBeGreaterThan(minimal.length);
  });
});
