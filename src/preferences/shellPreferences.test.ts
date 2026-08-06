import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SHELL_PREFERENCES,
  loadShellPreferences,
  saveShellPreferences,
} from "./shellPreferences";

const STORAGE_KEY = "glacier:shell-preferences:v1";

afterEach(() => {
  window.localStorage.clear();
});

describe("shellPreferences", () => {
  it("returns defaults when nothing is persisted", () => {
    expect(loadShellPreferences()).toEqual(DEFAULT_SHELL_PREFERENCES);
  });

  it("round-trips a saved preference", () => {
    saveShellPreferences({ consoleVisible: false });

    expect(loadShellPreferences()).toEqual({ consoleVisible: false });
  });

  it("falls back to defaults on malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(loadShellPreferences()).toEqual(DEFAULT_SHELL_PREFERENCES);
  });

  it("falls back to defaults on a value with the wrong shape", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    expect(loadShellPreferences()).toEqual(DEFAULT_SHELL_PREFERENCES);
  });

  it("falls back to defaults when consoleVisible has the wrong type", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ consoleVisible: "yes" }),
    );

    expect(loadShellPreferences()).toEqual(DEFAULT_SHELL_PREFERENCES);
  });
});
