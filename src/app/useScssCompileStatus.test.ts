import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useScssCompileStatus } from "./useScssCompileStatus";

describe("useScssCompileStatus", () => {
  it("starts with no error, no compiled CSS, and not stale", () => {
    const { result } = renderHook(() => useScssCompileStatus("project-1:scss"));

    expect(result.current.lastError).toBeNull();
    expect(result.current.compiledCss).toBeNull();
    expect(result.current.isStale).toBe(false);
  });

  it("recordSuccess stores the compiled CSS and clears any error", () => {
    const { result } = renderHook(() => useScssCompileStatus("project-1:scss"));

    act(() => {
      result.current.recordFailure({ message: "boom" });
    });
    expect(result.current.isStale).toBe(true);

    act(() => {
      result.current.recordSuccess(".a { color: red; }");
    });

    expect(result.current.compiledCss).toBe(".a { color: red; }");
    expect(result.current.lastError).toBeNull();
    expect(result.current.isStale).toBe(false);
  });

  it("recordFailure marks the status stale and preserves the last compiled CSS", () => {
    const { result } = renderHook(() => useScssCompileStatus("project-1:scss"));

    act(() => {
      result.current.recordSuccess(".a {}");
    });
    act(() => {
      result.current.recordFailure({ message: "syntax error", line: 3 });
    });

    expect(result.current.lastError).toEqual({
      message: "syntax error",
      line: 3,
    });
    expect(result.current.compiledCss).toBe(".a {}");
    expect(result.current.isStale).toBe(true);
  });

  it("resets lastError and compiledCss when resetKey changes", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useScssCompileStatus(resetKey),
      { initialProps: { resetKey: "project-1:scss" } },
    );

    act(() => {
      result.current.recordFailure({ message: "boom" });
    });
    expect(result.current.isStale).toBe(true);

    rerender({ resetKey: "project-2:scss" });

    expect(result.current.lastError).toBeNull();
    expect(result.current.compiledCss).toBeNull();
    expect(result.current.isStale).toBe(false);
  });

  it("resets when resetKey changes due to a css<->scss language toggle on the same project", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useScssCompileStatus(resetKey),
      { initialProps: { resetKey: "project-1:scss" } },
    );

    act(() => {
      result.current.recordSuccess(".a {}");
    });

    rerender({ resetKey: "project-1:css" });

    expect(result.current.compiledCss).toBeNull();
  });

  it("does not reset when resetKey stays the same across rerenders", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useScssCompileStatus(resetKey),
      { initialProps: { resetKey: "project-1:scss" } },
    );

    act(() => {
      result.current.recordSuccess(".a {}");
    });

    rerender({ resetKey: "project-1:scss" });

    expect(result.current.compiledCss).toBe(".a {}");
  });
});
