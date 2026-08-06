import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSaveShortcut } from "./useSaveShortcut";

function dispatchKeydown(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", init));
}

describe("useSaveShortcut", () => {
  it("calls saveNow and prevents default on Ctrl+S", () => {
    const saveNow = vi.fn();
    renderHook(() => useSaveShortcut(saveNow));

    const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(saveNow).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("calls saveNow on Cmd+S (metaKey)", () => {
    const saveNow = vi.fn();
    renderHook(() => useSaveShortcut(saveNow));

    dispatchKeydown({ key: "s", metaKey: true });

    expect(saveNow).toHaveBeenCalledTimes(1);
  });

  it("ignores Ctrl+Shift+S", () => {
    const saveNow = vi.fn();
    renderHook(() => useSaveShortcut(saveNow));

    dispatchKeydown({ key: "s", ctrlKey: true, shiftKey: true });

    expect(saveNow).not.toHaveBeenCalled();
  });

  it("ignores Ctrl+Alt+S", () => {
    const saveNow = vi.fn();
    renderHook(() => useSaveShortcut(saveNow));

    dispatchKeydown({ key: "s", ctrlKey: true, altKey: true });

    expect(saveNow).not.toHaveBeenCalled();
  });

  it("ignores unrelated keys", () => {
    const saveNow = vi.fn();
    renderHook(() => useSaveShortcut(saveNow));

    dispatchKeydown({ key: "a", ctrlKey: true });

    expect(saveNow).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const saveNow = vi.fn();
    const { unmount } = renderHook(() => useSaveShortcut(saveNow));

    unmount();
    dispatchKeydown({ key: "s", ctrlKey: true });

    expect(saveNow).not.toHaveBeenCalled();
  });
});
