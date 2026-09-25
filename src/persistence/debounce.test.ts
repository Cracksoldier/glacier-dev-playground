import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncer } from "./debounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createDebouncer", () => {
  it("runs fn after the delay with the scheduled value", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(500, fn);

    debouncer.schedule("a");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("collapses rapid successive schedules into a single call with the latest value", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(500, fn);

    debouncer.schedule("a");
    vi.advanceTimersByTime(200);
    debouncer.schedule("b");
    vi.advanceTimersByTime(200);
    debouncer.schedule("c");
    vi.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledExactlyOnceWith("c");
  });

  it("flush runs immediately and clears the pending timer", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(500, fn);

    debouncer.schedule("a");
    debouncer.flush();
    expect(fn).toHaveBeenCalledExactlyOnceWith("a");

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("flush is a no-op when nothing is scheduled", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(500, fn);

    debouncer.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it("cancel discards a pending call", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(500, fn);

    debouncer.schedule("a");
    debouncer.cancel();
    vi.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });

  it("isPending reports whether a call is waiting to run", () => {
    const debouncer = createDebouncer(500, vi.fn());
    expect(debouncer.isPending()).toBe(false);

    debouncer.schedule("a");
    expect(debouncer.isPending()).toBe(true);

    vi.advanceTimersByTime(500);
    expect(debouncer.isPending()).toBe(false);

    debouncer.schedule("b");
    debouncer.flush();
    expect(debouncer.isPending()).toBe(false);
  });
});
