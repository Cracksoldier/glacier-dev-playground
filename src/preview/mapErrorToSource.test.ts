import { describe, expect, it } from "vitest";
import type { ProjectSource } from "../models/project";
import { mapRuntimeErrorLine } from "./mapErrorToSource";
import { computePreviewLineOffsets } from "./previewDocument";

function makeSource(overrides: Partial<ProjectSource> = {}): ProjectSource {
  return {
    html: "<p>hello</p>",
    stylesheet: "p { color: red; }",
    stylesheetLanguage: "css",
    script: 'console.log("hi");',
    scriptLanguage: "javascript",
    executionMode: "classic",
    headContent: "",
    ...overrides,
  };
}

describe("mapRuntimeErrorLine", () => {
  it("maps a line at the start of the style block", () => {
    const offsets = computePreviewLineOffsets(makeSource());
    expect(mapRuntimeErrorLine(offsets.style.start, offsets)).toEqual({
      panel: "style",
      line: 1,
    });
  });

  it("maps a line at the start of the html block", () => {
    const offsets = computePreviewLineOffsets(makeSource());
    expect(mapRuntimeErrorLine(offsets.html.start, offsets)).toEqual({
      panel: "html",
      line: 1,
    });
  });

  it("maps a line at the start of the script block", () => {
    const offsets = computePreviewLineOffsets(makeSource());
    expect(mapRuntimeErrorLine(offsets.script.start, offsets)).toEqual({
      panel: "script",
      line: 1,
    });
  });

  it("maps a line in the middle of a multi-line script block to the correct within-block line", () => {
    const source = makeSource({
      script: "const a = 1;\nconst b = 2;\nthrow new Error('x');",
    });
    const offsets = computePreviewLineOffsets(source);

    expect(mapRuntimeErrorLine(offsets.script.start + 2, offsets)).toEqual({
      panel: "script",
      line: 3,
    });
  });

  it("returns null for a line inside the fixed boilerplate before the style block", () => {
    const offsets = computePreviewLineOffsets(makeSource());
    expect(mapRuntimeErrorLine(1, offsets)).toBeNull();
  });

  it("returns null for a line inside the bridge script between the html and script blocks", () => {
    const offsets = computePreviewLineOffsets(makeSource());
    // The bridge script's own <script> tag sits strictly between the html
    // block's end and the user script block's start.
    expect(mapRuntimeErrorLine(offsets.html.end + 1, offsets)).toBeNull();
  });

  it("returns null for a line past the end of the document", () => {
    const offsets = computePreviewLineOffsets(makeSource());
    expect(mapRuntimeErrorLine(offsets.script.end + 100, offsets)).toBeNull();
  });
});
