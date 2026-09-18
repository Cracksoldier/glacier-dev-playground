import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { buildDiagnosticFromError } from "./editorDiagnostics";

function docFor(text: string) {
  return EditorState.create({ doc: text }).doc;
}

describe("buildDiagnosticFromError", () => {
  it("positions the diagnostic at the start of the reported line and column", () => {
    const doc = docFor("one\ntwo\nthree");

    const diagnostic = buildDiagnosticFromError(doc, {
      message: "boom",
      line: 2,
      column: 2,
    });

    expect(diagnostic.from).toBe(doc.line(2).from + 1);
    expect(diagnostic.to).toBe(doc.line(2).to);
    expect(diagnostic.severity).toBe("error");
    expect(diagnostic.message).toBe("boom");
  });

  it("defaults to the start of line 1 when line/column are omitted", () => {
    const doc = docFor("one\ntwo\nthree");

    const diagnostic = buildDiagnosticFromError(doc, { message: "boom" });

    expect(diagnostic.from).toBe(doc.line(1).from);
    expect(diagnostic.to).toBe(doc.line(1).to);
  });

  it("clamps a line number below the document's range to line 1", () => {
    const doc = docFor("one\ntwo\nthree");

    const diagnostic = buildDiagnosticFromError(doc, {
      message: "boom",
      line: 0,
    });

    expect(diagnostic.from).toBe(doc.line(1).from);
    expect(diagnostic.to).toBe(doc.line(1).to);
  });

  it("clamps a line number past the document's range to the last line", () => {
    const doc = docFor("one\ntwo\nthree");

    const diagnostic = buildDiagnosticFromError(doc, {
      message: "boom",
      line: 999,
    });

    expect(diagnostic.from).toBe(doc.line(3).from);
    expect(diagnostic.to).toBe(doc.line(3).to);
  });

  it("clamps a column past the line's length to the end of the line", () => {
    const doc = docFor("one\ntwo\nthree");

    const diagnostic = buildDiagnosticFromError(doc, {
      message: "boom",
      line: 1,
      column: 999,
    });

    expect(diagnostic.from).toBe(doc.line(1).to);
    expect(diagnostic.to).toBe(doc.line(1).to);
  });

  it("clamps a column below 1 to the start of the line", () => {
    const doc = docFor("one\ntwo\nthree");

    const diagnostic = buildDiagnosticFromError(doc, {
      message: "boom",
      line: 1,
      column: -5,
    });

    expect(diagnostic.from).toBe(doc.line(1).from);
  });
});
