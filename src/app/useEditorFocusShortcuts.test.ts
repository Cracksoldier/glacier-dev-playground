import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CodeMirrorEditorHandle } from "../components/editors/CodeMirrorEditor";
import {
  type FocusableHandle,
  useEditorFocusShortcuts,
} from "./useEditorFocusShortcuts";

function dispatchKeydown(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", init));
}

function makeRef(focus: () => void): RefObject<CodeMirrorEditorHandle | null> {
  return { current: { focus, focusLine: vi.fn() } };
}

function makePreviewRef(focus: () => void): RefObject<FocusableHandle | null> {
  return { current: { focus } };
}

describe("useEditorFocusShortcuts", () => {
  it("focuses the HTML editor on Alt+1", () => {
    const htmlFocus = vi.fn();
    const cssFocus = vi.fn();
    const jsFocus = vi.fn();
    const previewFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(cssFocus),
        makeRef(jsFocus),
        makePreviewRef(previewFocus),
      ),
    );

    dispatchKeydown({ key: "1", code: "Digit1", altKey: true });

    expect(htmlFocus).toHaveBeenCalledTimes(1);
    expect(cssFocus).not.toHaveBeenCalled();
    expect(jsFocus).not.toHaveBeenCalled();
    expect(previewFocus).not.toHaveBeenCalled();
  });

  it("matches the physical key, so Alt+1 works when the layout produces a different character", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
      ),
    );

    // macOS Option+1 produces "¡"; AZERTY's unshifted digit-1 key is "&".
    dispatchKeydown({ key: "¡", code: "Digit1", altKey: true });
    dispatchKeydown({ key: "&", code: "Digit1", altKey: true });

    expect(htmlFocus).toHaveBeenCalledTimes(2);
  });

  it("focuses the CSS editor on Alt+2", () => {
    const htmlFocus = vi.fn();
    const cssFocus = vi.fn();
    const jsFocus = vi.fn();
    const previewFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(cssFocus),
        makeRef(jsFocus),
        makePreviewRef(previewFocus),
      ),
    );

    dispatchKeydown({ key: "2", code: "Digit2", altKey: true });

    expect(cssFocus).toHaveBeenCalledTimes(1);
    expect(htmlFocus).not.toHaveBeenCalled();
    expect(jsFocus).not.toHaveBeenCalled();
    expect(previewFocus).not.toHaveBeenCalled();
  });

  it("focuses the JS editor on Alt+3", () => {
    const htmlFocus = vi.fn();
    const cssFocus = vi.fn();
    const jsFocus = vi.fn();
    const previewFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(cssFocus),
        makeRef(jsFocus),
        makePreviewRef(previewFocus),
      ),
    );

    dispatchKeydown({ key: "3", code: "Digit3", altKey: true });

    expect(jsFocus).toHaveBeenCalledTimes(1);
    expect(htmlFocus).not.toHaveBeenCalled();
    expect(cssFocus).not.toHaveBeenCalled();
    expect(previewFocus).not.toHaveBeenCalled();
  });

  it("focuses the preview panel on Alt+4", () => {
    const htmlFocus = vi.fn();
    const cssFocus = vi.fn();
    const jsFocus = vi.fn();
    const previewFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(cssFocus),
        makeRef(jsFocus),
        makePreviewRef(previewFocus),
      ),
    );

    dispatchKeydown({ key: "4", code: "Digit4", altKey: true });

    expect(previewFocus).toHaveBeenCalledTimes(1);
    expect(htmlFocus).not.toHaveBeenCalled();
    expect(cssFocus).not.toHaveBeenCalled();
    expect(jsFocus).not.toHaveBeenCalled();
  });

  it("prevents default on a matching combo", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
      ),
    );

    const event = new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      altKey: true,
    });
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
        makePreviewRef(vi.fn()),
      ),
    );

    dispatchKeydown({ key: "1", code: "Digit1", altKey: true, shiftKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });

  it("ignores Ctrl+Alt+1", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
      ),
    );

    dispatchKeydown({ key: "1", code: "Digit1", altKey: true, ctrlKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });

  it("ignores unrelated keys", () => {
    const htmlFocus = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
      ),
    );

    dispatchKeydown({ key: "5", code: "Digit5", altKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });

  it("selects the matching tab before focusing on a narrow layout", async () => {
    const htmlFocus = vi.fn();
    const setActiveTab = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
        { isNarrow: true, setActiveTab },
      ),
    );

    dispatchKeydown({ key: "1", code: "Digit1", altKey: true });

    expect(setActiveTab).toHaveBeenCalledWith("html");
    // Focus is deferred until the newly selected tab panel is rendered.
    expect(htmlFocus).not.toHaveBeenCalled();
    await new Promise(requestAnimationFrame);
    expect(htmlFocus).toHaveBeenCalledTimes(1);
  });

  it("selects the preview tab on Alt+4 on a narrow layout", async () => {
    const previewFocus = vi.fn();
    const setActiveTab = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(previewFocus),
        { isNarrow: true, setActiveTab },
      ),
    );

    dispatchKeydown({ key: "4", code: "Digit4", altKey: true });

    expect(setActiveTab).toHaveBeenCalledWith("preview");
    await new Promise(requestAnimationFrame);
    expect(previewFocus).toHaveBeenCalledTimes(1);
  });

  it("focuses immediately without selecting a tab on a wide layout", () => {
    const htmlFocus = vi.fn();
    const setActiveTab = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
        { isNarrow: false, setActiveTab },
      ),
    );

    dispatchKeydown({ key: "1", code: "Digit1", altKey: true });

    expect(htmlFocus).toHaveBeenCalledTimes(1);
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it("leaves preview-only before focusing an editor", async () => {
    const cssFocus = vi.fn();
    const exitPreviewOnly = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(vi.fn()),
        makeRef(cssFocus),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
        { isNarrow: false, setActiveTab: vi.fn() },
        { isPreviewOnly: true, exitPreviewOnly },
      ),
    );

    dispatchKeydown({ key: "2", code: "Digit2", altKey: true });

    expect(exitPreviewOnly).toHaveBeenCalledTimes(1);
    // Focus is deferred until the editors are shown again.
    expect(cssFocus).not.toHaveBeenCalled();
    await new Promise(requestAnimationFrame);
    expect(cssFocus).toHaveBeenCalledTimes(1);
  });

  it("stays in preview-only when focusing the preview on Alt+4", () => {
    const previewFocus = vi.fn();
    const exitPreviewOnly = vi.fn();
    renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(previewFocus),
        { isNarrow: false, setActiveTab: vi.fn() },
        { isPreviewOnly: true, exitPreviewOnly },
      ),
    );

    dispatchKeydown({ key: "4", code: "Digit4", altKey: true });

    expect(previewFocus).toHaveBeenCalledTimes(1);
    expect(exitPreviewOnly).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const htmlFocus = vi.fn();
    const { unmount } = renderHook(() =>
      useEditorFocusShortcuts(
        makeRef(htmlFocus),
        makeRef(vi.fn()),
        makeRef(vi.fn()),
        makePreviewRef(vi.fn()),
      ),
    );

    unmount();
    dispatchKeydown({ key: "1", code: "Digit1", altKey: true });

    expect(htmlFocus).not.toHaveBeenCalled();
  });
});
