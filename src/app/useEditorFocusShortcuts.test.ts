import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CodeMirrorEditorHandle } from "../components/editors/CodeMirrorEditor";
import { useEditorFocusShortcuts } from "./useEditorFocusShortcuts";

function dispatchKeydown(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", init));
}

function makeRef(focus: () => void): RefObject<CodeMirrorEditorHandle | null> {
  return { current: { focus } };
}

describe("useEditorFocusShortcuts", () => {
  it("focuses the HTML editor on Alt+1", () => {
    const htmlFocus = vi.fn();
    const cssFocus = vi.fn();
    const jsFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(cssFocus),
        makeRef(jsFocus),
      ),
    );

    dispatchKeydown({ key: "1", altKey: true });

    expect(htmlFocus).toHaveBeenCalledTimes(1);
    expect(cssFocus).not.toHaveBeenCalled();
    expect(jsFocus).not.toHaveBeenCalled();
  });

  it("focuses the CSS editor on Alt+2", () => {
    const htmlFocus = vi.fn();
    const cssFocus = vi.fn();
    const jsFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(cssFocus),
        makeRef(jsFocus),
      ),
    );

    dispatchKeydown({ key: "2", altKey: true });

    expect(cssFocus).toHaveBeenCalledTimes(1);
    expect(htmlFocus).not.toHaveBeenCalled();
    expect(jsFocus).not.toHaveBeenCalled();
  });

  it("focuses the JS editor on Alt+3", () => {
    const htmlFocus = vi.fn();
    const cssFocus = vi.fn();
    const jsFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(cssFocus),
        makeRef(jsFocus),
      ),
    );

    dispatchKeydown({ key: "3", altKey: true });

    expect(jsFocus).toHaveBeenCalledTimes(1);
    expect(htmlFocus).not.toHaveBeenCalled();
    expect(cssFocus).not.toHaveBeenCalled();
  });

  it("prevents default on a matching combo", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
      ),
    );

    const event = new KeyboardEvent("keydown", { key: "1", altKey: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("ignores Alt+Shift+1", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
      ),
    );

    dispatchKeydown({ key: "1", altKey: true, shiftKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });

  it("ignores Ctrl+Alt+1", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
      ),
    );

    dispatchKeydown({ key: "1", altKey: true, ctrlKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });

  it("ignores unrelated keys", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
      ),
    );

    dispatchKeydown({ key: "4", altKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const htmlFocus = vi.fn();
    const { unmount } = renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
      ),
    );

    unmount();
    dispatchKeydown({ key: "1", altKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });
});
