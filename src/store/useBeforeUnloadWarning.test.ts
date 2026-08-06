import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SaveStatus } from "../models/saveStatus";
import { useBeforeUnloadWarning } from "./useBeforeUnloadWarning";

function dispatchBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("useBeforeUnloadWarning", () => {
  it("prevents default while saving", () => {
    renderHook(() => useBeforeUnloadWarning("saving"));

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(true);
  });

  it("prevents default while save-failed", () => {
    renderHook(() => useBeforeUnloadWarning("save-failed"));

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(true);
  });

  it("does not warn while saved", () => {
    renderHook(() => useBeforeUnloadWarning("saved"));

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
  });

  it("does not warn while storage-unavailable", () => {
    renderHook(() => useBeforeUnloadWarning("storage-unavailable"));

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
  });

  it("removes the listener when the status becomes safe", () => {
    const { rerender } = renderHook(
      ({ status }: { status: SaveStatus }) => useBeforeUnloadWarning(status),
      { initialProps: { status: "saving" } },
    );

    rerender({ status: "saved" });
    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
  });

  it("removes the listener on unmount", () => {
    const { unmount } = renderHook(() => useBeforeUnloadWarning("saving"));

    unmount();
    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
  });
});
