import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRunShortcut } from "./useRunShortcut";

function dispatchKeydown(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", init));
}

describe("useRunShortcut", () => {
  it("calls run on Ctrl+Enter", () => {
    const run = vi.fn();
    renderHook(() => useRunShortcut(run));

    dispatchKeydown({ key: "Enter", ctrlKey: true });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("calls run on Meta+Enter", () => {
    const run = vi.fn();
    renderHook(() => useRunShortcut(run));

    dispatchKeydown({ key: "Enter", metaKey: true });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("prevents default on a matching combo", () => {
    renderHook(() => useRunShortcut(vi.fn()));

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("ignores plain Enter", () => {
    const run = vi.fn();
    renderHook(() => useRunShortcut(run));

    dispatchKeydown({ key: "Enter" });

    expect(run).not.toHaveBeenCalled();
  });

  it("ignores Ctrl+Shift+Enter", () => {
    const run = vi.fn();
    renderHook(() => useRunShortcut(run));

    dispatchKeydown({ key: "Enter", ctrlKey: true, shiftKey: true });

    expect(run).not.toHaveBeenCalled();
  });

  it("ignores Ctrl+Alt+Enter", () => {
    const run = vi.fn();
    renderHook(() => useRunShortcut(run));

    dispatchKeydown({ key: "Enter", ctrlKey: true, altKey: true });

    expect(run).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const run = vi.fn();
    const { unmount } = renderHook(() => useRunShortcut(run));

    unmount();
    dispatchKeydown({ key: "Enter", ctrlKey: true });

    expect(run).not.toHaveBeenCalled();
  });
});
