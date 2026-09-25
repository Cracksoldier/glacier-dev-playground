import { describe, expect, it, vi } from "vitest";
import { compileScript } from "./tsCompiler";

vi.mock("./tsCompilerHost", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tsCompilerHost")>();
  return {
    ...actual,
    createTsCompilerHost: (
      ...args: Parameters<typeof actual.createTsCompilerHost>
    ) => ({
      ...actual.createTsCompilerHost(...args),
      getEmittedJs: () => null,
    }),
  };
});

describe("compileScript when the emit produces no output", () => {
  it("reports a blocking error for TypeScript instead of an error-free result with no JS", () => {
    const result = compileScript("const a: number = 1;", {
      scriptLanguage: "typescript",
      executionMode: "classic",
    });

    expect(result.emittedJs).toBeNull();
    expect(result.diagnostics).toContainEqual({
      message: "The TypeScript compiler produced no JavaScript output.",
      category: "error",
    });
  });

  it("does not block JavaScript, whose authored source is what executes", () => {
    const result = compileScript("const a = 1;", {
      scriptLanguage: "javascript",
      executionMode: "classic",
    });

    expect(result.diagnostics.filter((d) => d.category === "error")).toEqual(
      [],
    );
  });
});
