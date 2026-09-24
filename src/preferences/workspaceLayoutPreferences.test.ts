import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_WORKSPACE_LAYOUT_PREFERENCES,
  loadWorkspaceLayoutPreferences,
  saveWorkspaceLayoutPreferences,
} from "./workspaceLayoutPreferences";

const STORAGE_KEY = "glacier:workspace-layout-mode:v1";

afterEach(() => {
  window.localStorage.clear();
});

describe("workspaceLayoutPreferences", () => {
  it("defaults to the default layout when nothing is persisted", () => {
    expect(loadWorkspaceLayoutPreferences()).toEqual({ layout: "default" });
  });

  it("round-trips a saved preference", () => {
    saveWorkspaceLayoutPreferences({ layout: "side" });

    expect(loadWorkspaceLayoutPreferences()).toEqual({ layout: "side" });
  });

  it("falls back to defaults on malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(loadWorkspaceLayoutPreferences()).toEqual(
      DEFAULT_WORKSPACE_LAYOUT_PREFERENCES,
    );
  });

  it("falls back to defaults when layout is not a known layout", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ layout: "columns" }),
    );

    expect(loadWorkspaceLayoutPreferences()).toEqual(
      DEFAULT_WORKSPACE_LAYOUT_PREFERENCES,
    );
  });

  it("falls back to defaults on a value with the wrong shape", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify("side"));

    expect(loadWorkspaceLayoutPreferences()).toEqual(
      DEFAULT_WORKSPACE_LAYOUT_PREFERENCES,
    );
  });

  it("neither load nor save throws when storage access is blocked", () => {
    const storageSpy = vi
      .spyOn(window, "localStorage", "get")
      .mockImplementation(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      });
    try {
      expect(loadWorkspaceLayoutPreferences()).toEqual(
        DEFAULT_WORKSPACE_LAYOUT_PREFERENCES,
      );
      expect(() =>
        saveWorkspaceLayoutPreferences({ layout: "preview" }),
      ).not.toThrow();
    } finally {
      storageSpy.mockRestore();
    }
  });
});
