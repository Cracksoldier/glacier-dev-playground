import { describe, expect, it, vi } from "vitest";
import { compileScss } from "./scssCompiler";

vi.mock("sass", () => {
  throw new Error("Failed to fetch dynamically imported module");
});

describe("compileScss when Dart Sass fails to load", () => {
  it("resolves with a failure result instead of rejecting", async () => {
    const result = await compileScss(".a { color: red; }");

    expect(result.type).toBe("failure");
  });
});
