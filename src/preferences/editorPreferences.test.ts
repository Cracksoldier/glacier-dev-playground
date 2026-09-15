import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EDITOR_PREFERENCES,
  loadEditorPreferences,
  saveEditorPreferences,
} from "./editorPreferences";

const STORAGE_KEY = "glacier:editor-preferences:v1";

afterEach(() => {
  window.localStorage.clear();
});

describe("editorPreferences", () => {
  it("returns defaults when nothing is persisted", () => {
    expect(loadEditorPreferences()).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("round-trips a saved preference", () => {
    const preferences = {
      fontSize: 18,
      tabWidth: 4,
      wordWrap: true,
      lineNumbers: false,
    };
    saveEditorPreferences(preferences);

    expect(loadEditorPreferences()).toEqual(preferences);
  });

  it("falls back to defaults on malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(loadEditorPreferences()).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("falls back to defaults on a value with the wrong shape", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    expect(loadEditorPreferences()).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("falls back to defaults when a field has the wrong type", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fontSize: "14",
        tabWidth: 2,
        wordWrap: false,
        lineNumbers: true,
      }),
    );

    expect(loadEditorPreferences()).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });
});
