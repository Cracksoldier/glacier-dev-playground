import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT_PREFERENCES,
  loadLayoutPreferences,
  saveLayoutPreferences,
} from "./layoutPreferences";

const STORAGE_KEY = "glacier:layout-preferences:v1";

afterEach(() => {
  window.localStorage.clear();
});

describe("layoutPreferences", () => {
  it("returns defaults when nothing is persisted", () => {
    expect(loadLayoutPreferences()).toEqual(DEFAULT_LAYOUT_PREFERENCES);
  });

  it("round-trips a saved preference", () => {
    saveLayoutPreferences({ activeTab: "console" });

    expect(loadLayoutPreferences()).toEqual({ activeTab: "console" });
  });

  it("falls back to defaults on malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(loadLayoutPreferences()).toEqual(DEFAULT_LAYOUT_PREFERENCES);
  });

  it("falls back to defaults on a value with the wrong shape", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    expect(loadLayoutPreferences()).toEqual(DEFAULT_LAYOUT_PREFERENCES);
  });

  it("falls back to defaults when activeTab has the wrong type", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: 42 }));

    expect(loadLayoutPreferences()).toEqual(DEFAULT_LAYOUT_PREFERENCES);
  });

  it("falls back to defaults when activeTab is not a known tab", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeTab: "nonsense" }),
    );

    expect(loadLayoutPreferences()).toEqual(DEFAULT_LAYOUT_PREFERENCES);
  });
});
