import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EDITOR_PREFERENCES,
  loadEditorPreferences,
} from "../preferences/editorPreferences";
import { useEditorPreferences } from "./useEditorPreferences";

afterEach(() => {
  window.localStorage.clear();
});

describe("useEditorPreferences", () => {
  it("defaults to the default preferences when nothing is persisted", () => {
    const { result } = renderHook(() => useEditorPreferences());

    expect(result.current.preferences).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("seeds from a persisted preference", () => {
    window.localStorage.setItem(
      "glacier:editor-preferences:v1",
      JSON.stringify({
        fontSize: 20,
        tabWidth: 4,
        wordWrap: true,
        lineNumbers: false,
      }),
    );

    const { result } = renderHook(() => useEditorPreferences());

    expect(result.current.preferences.fontSize).toBe(20);
  });

  it("merges and persists a partial update", () => {
    const { result } = renderHook(() => useEditorPreferences());

    act(() => {
      result.current.updatePreferences({ fontSize: 18 });
    });

    expect(result.current.preferences).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 18,
    });
    expect(loadEditorPreferences().fontSize).toBe(18);
  });
});
