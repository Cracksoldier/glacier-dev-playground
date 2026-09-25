import { afterEach, describe, expect, it, vi } from "vitest";
import { workspaceLayoutStorage } from "./layoutStorage";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("workspaceLayoutStorage", () => {
  it("reads and writes through to localStorage when it is available", () => {
    workspaceLayoutStorage.setItem("layout-key", "[50,50]");

    expect(window.localStorage.getItem("layout-key")).toBe("[50,50]");
    expect(workspaceLayoutStorage.getItem("layout-key")).toBe("[50,50]");
  });

  it("degrades to no stored layout when accessing localStorage throws", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError");
    });

    expect(workspaceLayoutStorage.getItem("layout-key")).toBeNull();
    expect(() =>
      workspaceLayoutStorage.setItem("layout-key", "[50,50]"),
    ).not.toThrow();
  });
});
