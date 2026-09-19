import { describe, expect, it } from "vitest";
import { buildExportFileName } from "./exportFileName";

describe("buildExportFileName", () => {
  it("lowercases and appends the extension", () => {
    expect(buildExportFileName("My Project", "json")).toBe("my-project.json");
  });

  it("collapses runs of non-alphanumeric characters to a single hyphen", () => {
    expect(buildExportFileName("Hello!!   World??", "html")).toBe(
      "hello-world.html",
    );
  });

  it("trims leading and trailing hyphens", () => {
    expect(buildExportFileName("  --Weird Title--  ", "zip")).toBe(
      "weird-title.zip",
    );
  });

  it("falls back to 'project' when nothing alphanumeric remains", () => {
    expect(buildExportFileName("???", "json")).toBe("project.json");
    expect(buildExportFileName("", "json")).toBe("project.json");
  });

  it("preserves digits", () => {
    expect(buildExportFileName("Project 2026", "json")).toBe(
      "project-2026.json",
    );
  });
});
