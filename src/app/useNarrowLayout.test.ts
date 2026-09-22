import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNarrowLayout } from "./useNarrowLayout";

class FakeMediaQueryList extends EventTarget {
  matches: boolean;
  media: string;

  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
    this.matches = matches;
  }

  addListener() {}
  removeListener() {}
}

let originalMatchMedia: typeof window.matchMedia;
let fakeMediaQueryList: FakeMediaQueryList;

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
  fakeMediaQueryList = new FakeMediaQueryList("(max-width: 767.98px)", false);
  window.matchMedia = vi.fn(
    () => fakeMediaQueryList as unknown as MediaQueryList,
  );
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("useNarrowLayout", () => {
  it("returns false when the media query does not match", () => {
    const { result } = renderHook(() => useNarrowLayout());

    expect(result.current).toBe(false);
  });

  it("returns true when the media query already matches", () => {
    fakeMediaQueryList.matches = true;
    const { result } = renderHook(() => useNarrowLayout());

    expect(result.current).toBe(true);
  });

  it("updates when the media query change event fires", () => {
    const { result } = renderHook(() => useNarrowLayout());
    expect(result.current).toBe(false);

    act(() => {
      fakeMediaQueryList.matches = true;
      fakeMediaQueryList.dispatchEvent(
        Object.assign(new Event("change"), { matches: true }),
      );
    });

    expect(result.current).toBe(true);
  });

  it("removes the change listener on unmount", () => {
    const removeSpy = vi.spyOn(fakeMediaQueryList, "removeEventListener");
    const { unmount } = renderHook(() => useNarrowLayout());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
