import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { loadWorkspaceLayoutPreferences } from "../preferences/workspaceLayoutPreferences";
import { useWorkspaceLayout } from "./useWorkspaceLayout";

afterEach(() => {
  window.localStorage.clear();
});

describe("useWorkspaceLayout", () => {
  it("defaults to the default layout and arrangement", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    expect(result.current.layout).toBe("default");
    expect(result.current.arrangement).toBe("default");
  });

  it("seeds from a persisted preference", () => {
    window.localStorage.setItem(
      "glacier:workspace-layout-mode:v1",
      JSON.stringify({ layout: "side" }),
    );

    const { result } = renderHook(() => useWorkspaceLayout());

    expect(result.current.layout).toBe("side");
    expect(result.current.arrangement).toBe("side");
  });

  it("uses the default arrangement when seeded with preview-only", () => {
    window.localStorage.setItem(
      "glacier:workspace-layout-mode:v1",
      JSON.stringify({ layout: "preview" }),
    );

    const { result } = renderHook(() => useWorkspaceLayout());

    expect(result.current.layout).toBe("preview");
    expect(result.current.arrangement).toBe("default");
  });

  it("sets and persists the new layout", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    act(() => {
      result.current.setLayout("side");
    });

    expect(result.current.layout).toBe("side");
    expect(result.current.arrangement).toBe("side");
    expect(loadWorkspaceLayoutPreferences().layout).toBe("side");
  });

  it("keeps the last editing arrangement while in preview-only", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    act(() => {
      result.current.setLayout("side");
    });
    act(() => {
      result.current.setLayout("preview");
    });

    expect(result.current.layout).toBe("preview");
    expect(result.current.arrangement).toBe("side");
    expect(loadWorkspaceLayoutPreferences().layout).toBe("preview");
  });
});
