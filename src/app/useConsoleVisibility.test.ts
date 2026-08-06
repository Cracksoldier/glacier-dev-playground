import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { loadShellPreferences } from "../preferences/shellPreferences";
import { useConsoleVisibility } from "./useConsoleVisibility";

afterEach(() => {
  window.localStorage.clear();
});

describe("useConsoleVisibility", () => {
  it("defaults to visible when no preference is persisted", () => {
    const { result } = renderHook(() => useConsoleVisibility());

    expect(result.current.isConsoleVisible).toBe(true);
  });

  it("seeds from a persisted preference", () => {
    window.localStorage.setItem(
      "glacier:shell-preferences:v1",
      JSON.stringify({ consoleVisible: false }),
    );

    const { result } = renderHook(() => useConsoleVisibility());

    expect(result.current.isConsoleVisible).toBe(false);
  });

  it("toggles and persists the new value", () => {
    const { result } = renderHook(() => useConsoleVisibility());

    act(() => {
      result.current.toggleConsoleVisible();
    });

    expect(result.current.isConsoleVisible).toBe(false);
    expect(loadShellPreferences().consoleVisible).toBe(false);
  });
});
