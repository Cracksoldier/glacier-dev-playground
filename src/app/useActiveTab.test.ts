import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { loadLayoutPreferences } from "../preferences/layoutPreferences";
import { useActiveTab } from "./useActiveTab";

afterEach(() => {
  window.localStorage.clear();
});

describe("useActiveTab", () => {
  it("defaults to the html tab when no preference is persisted", () => {
    const { result } = renderHook(() => useActiveTab());

    expect(result.current.activeTab).toBe("html");
  });

  it("seeds from a persisted preference", () => {
    window.localStorage.setItem(
      "glacier:layout-preferences:v1",
      JSON.stringify({ activeTab: "console" }),
    );

    const { result } = renderHook(() => useActiveTab());

    expect(result.current.activeTab).toBe("console");
  });

  it("sets and persists the new tab", () => {
    const { result } = renderHook(() => useActiveTab());

    act(() => {
      result.current.setActiveTab("preview");
    });

    expect(result.current.activeTab).toBe("preview");
    expect(loadLayoutPreferences().activeTab).toBe("preview");
  });
});
