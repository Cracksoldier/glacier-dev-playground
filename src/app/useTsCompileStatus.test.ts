import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TsDiagnostic } from "../preview/tsWorkerProtocol";
import { useTsCompileStatus } from "./useTsCompileStatus";

describe("useTsCompileStatus", () => {
  it("starts with no diagnostics and not stale", () => {
    const { result } = renderHook(() =>
      useTsCompileStatus("project-1:javascript:classic"),
    );

    expect(result.current.diagnostics).toEqual([]);
    expect(result.current.isStale).toBe(false);
  });

  it("recordResult with only warning diagnostics is not stale", () => {
    const { result } = renderHook(() =>
      useTsCompileStatus("project-1:typescript:classic"),
    );
    const warning: TsDiagnostic = {
      message: "Types unavailable",
      category: "warning",
    };

    act(() => {
      result.current.recordResult([warning]);
    });

    expect(result.current.diagnostics).toEqual([warning]);
    expect(result.current.isStale).toBe(false);
  });

  it("recordResult with an error diagnostic marks the status stale", () => {
    const { result } = renderHook(() =>
      useTsCompileStatus("project-1:typescript:classic"),
    );

    const error: TsDiagnostic = { message: "Type error.", category: "error" };
    act(() => {
      result.current.recordResult([error]);
    });

    expect(result.current.diagnostics).toEqual([error]);
    expect(result.current.isStale).toBe(true);
  });

  it("recordResult with an empty list clears prior diagnostics and staleness", () => {
    const { result } = renderHook(() =>
      useTsCompileStatus("project-1:typescript:classic"),
    );

    act(() => {
      result.current.recordResult([
        { message: "Type error.", category: "error" },
      ]);
    });
    expect(result.current.isStale).toBe(true);

    act(() => {
      result.current.recordResult([]);
    });

    expect(result.current.diagnostics).toEqual([]);
    expect(result.current.isStale).toBe(false);
  });

  it("resets diagnostics when resetKey changes", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useTsCompileStatus(resetKey),
      { initialProps: { resetKey: "project-1:typescript:classic" } },
    );

    act(() => {
      result.current.recordResult([
        { message: "Type error.", category: "error" },
      ]);
    });
    expect(result.current.isStale).toBe(true);

    rerender({ resetKey: "project-2:typescript:classic" });

    expect(result.current.diagnostics).toEqual([]);
    expect(result.current.isStale).toBe(false);
  });

  it("resets when resetKey changes due to a javascript<->typescript toggle on the same project", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useTsCompileStatus(resetKey),
      { initialProps: { resetKey: "project-1:javascript:classic" } },
    );

    act(() => {
      result.current.recordResult([
        { message: "Type error.", category: "error" },
      ]);
    });

    rerender({ resetKey: "project-1:typescript:classic" });

    expect(result.current.isStale).toBe(false);
  });

  it("resets when resetKey changes due to a classic<->module toggle on the same project", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useTsCompileStatus(resetKey),
      { initialProps: { resetKey: "project-1:javascript:classic" } },
    );

    act(() => {
      result.current.recordResult([
        { message: "Type error.", category: "error" },
      ]);
    });

    rerender({ resetKey: "project-1:javascript:module" });

    expect(result.current.isStale).toBe(false);
  });

  it("does not reset when resetKey stays the same across rerenders", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useTsCompileStatus(resetKey),
      { initialProps: { resetKey: "project-1:javascript:classic" } },
    );

    act(() => {
      result.current.recordResult([
        { message: "Type error.", category: "error" },
      ]);
    });

    rerender({ resetKey: "project-1:javascript:classic" });

    expect(result.current.isStale).toBe(true);
  });
});
