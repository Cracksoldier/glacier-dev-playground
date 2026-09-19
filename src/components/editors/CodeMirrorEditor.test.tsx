import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CodeMirrorEditor, {
  type CodeMirrorEditorHandle,
} from "./CodeMirrorEditor";
import { buildLanguageExtensions } from "./editorExtensions";

const PREFERENCES = {
  fontSize: 14,
  tabWidth: 2,
  wordWrap: false,
  lineNumbers: true,
};

function renderEditor(
  props: Partial<React.ComponentProps<typeof CodeMirrorEditor>> = {},
) {
  const onChange = vi.fn();
  const utils = render(
    <CodeMirrorEditor
      value={props.value ?? ""}
      onChange={props.onChange ?? onChange}
      languageExtensions={buildLanguageExtensions("html", {})}
      preferences={props.preferences ?? PREFERENCES}
      ariaLabel={props.ariaLabel ?? "HTML source"}
      ref={props.ref}
      diagnosticError={props.diagnosticError}
      diagnosticErrors={props.diagnosticErrors}
      readOnly={props.readOnly}
    />,
  );
  return { onChange, ...utils };
}

afterEach(cleanup);

describe("CodeMirrorEditor", () => {
  it("renders a textbox with the given accessible name and initial content", () => {
    renderEditor({ value: "<p>hi</p>" });

    const textbox = screen.getByRole("textbox", { name: "HTML source" });
    expect(textbox).toHaveTextContent("<p>hi</p>");
  });

  it("does not call onChange merely from mounting", () => {
    const { onChange } = renderEditor({ value: "<p>hi</p>" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange with updated text when the user types", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor({ value: "" });

    const textbox = screen.getByRole("textbox", { name: "HTML source" });
    await user.click(textbox);
    await user.keyboard("hi");

    expect(onChange).toHaveBeenCalled();
    const lastCallText = onChange.mock.calls.at(-1)?.[0];
    expect(lastCallText).toBe("hi");
  });

  it("applies an external value change without re-emitting onChange", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeMirrorEditor
        value="one"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("html", {})}
        preferences={PREFERENCES}
        ariaLabel="HTML source"
      />,
    );

    rerender(
      <CodeMirrorEditor
        value="two"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("html", {})}
        preferences={PREFERENCES}
        ariaLabel="HTML source"
      />,
    );

    expect(
      screen.getByRole("textbox", { name: "HTML source" }),
    ).toHaveTextContent("two");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not remount the editor when preferences change", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeMirrorEditor
        value="stable"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("html", {})}
        preferences={PREFERENCES}
        ariaLabel="HTML source"
      />,
    );
    const initialNode = screen.getByRole("textbox", { name: "HTML source" });

    rerender(
      <CodeMirrorEditor
        value="stable"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("html", {})}
        preferences={{ ...PREFERENCES, fontSize: 18 }}
        ariaLabel="HTML source"
      />,
    );

    expect(screen.getByRole("textbox", { name: "HTML source" })).toBe(
      initialNode,
    );
  });

  it("does not remount the editor when languageExtensions change (same project, different language variant)", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeMirrorEditor
        value="const x = 1;"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("javascript", {
          scriptLanguage: "javascript",
        })}
        preferences={PREFERENCES}
        ariaLabel="Script source"
      />,
    );
    const initialNode = screen.getByRole("textbox", { name: "Script source" });

    rerender(
      <CodeMirrorEditor
        value="const x = 1;"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("javascript", {
          scriptLanguage: "typescript",
        })}
        preferences={PREFERENCES}
        ariaLabel="Script source"
      />,
    );

    expect(screen.getByRole("textbox", { name: "Script source" })).toBe(
      initialNode,
    );
  });

  it("exposes an imperative focus() handle", async () => {
    const ref = createRef<CodeMirrorEditorHandle>();
    renderEditor({ value: "", ref });

    const textbox = screen.getByRole("textbox", { name: "HTML source" });
    expect(textbox).not.toHaveFocus();

    ref.current?.focus();

    expect(textbox).toHaveFocus();
  });

  it("focusLine() moves the cursor to the start of the given line and focuses the editor", () => {
    const ref = createRef<CodeMirrorEditorHandle>();
    renderEditor({ value: "one\ntwo\nthree", ref });

    const textbox = screen.getByRole("textbox", { name: "HTML source" });
    expect(textbox).not.toHaveFocus();

    ref.current?.focusLine(2);

    expect(textbox).toHaveFocus();
  });

  it("focusLine() clamps a line number below the document's range to line 1", () => {
    const ref = createRef<CodeMirrorEditorHandle>();
    renderEditor({ value: "one\ntwo\nthree", ref });

    expect(() => ref.current?.focusLine(0)).not.toThrow();
  });

  it("focusLine() clamps a line number past the document's range to the last line", () => {
    const ref = createRef<CodeMirrorEditorHandle>();
    renderEditor({ value: "one\ntwo\nthree", ref });

    expect(() => ref.current?.focusLine(999)).not.toThrow();
  });

  it("renders no diagnostic marker when diagnosticError is null", () => {
    const { container } = renderEditor({
      value: ".a {}",
      diagnosticError: null,
    });

    expect(container.querySelector(".cm-lintRange-error")).toBeNull();
  });

  it("renders a diagnostic marker at the reported line when diagnosticError is set", () => {
    const { container } = renderEditor({
      value: ".a {\n  color: red\n}",
      diagnosticError: { message: "missing semicolon", line: 2, column: 1 },
    });

    expect(container.querySelector(".cm-lintRange-error")).not.toBeNull();
  });

  it("clears a previously rendered diagnostic marker when diagnosticError becomes null", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <CodeMirrorEditor
        value=".a {}"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("html", {})}
        preferences={PREFERENCES}
        ariaLabel="Stylesheet source"
        diagnosticError={{ message: "boom", line: 1 }}
      />,
    );
    expect(container.querySelector(".cm-lintRange-error")).not.toBeNull();

    rerender(
      <CodeMirrorEditor
        value=".a {}"
        onChange={onChange}
        languageExtensions={buildLanguageExtensions("html", {})}
        preferences={PREFERENCES}
        ariaLabel="Stylesheet source"
        diagnosticError={null}
      />,
    );

    expect(container.querySelector(".cm-lintRange-error")).toBeNull();
  });

  it("renders no diagnostic marker when diagnosticErrors is null", () => {
    const { container } = renderEditor({
      value: "const a = 1;",
      diagnosticErrors: null,
    });

    expect(container.querySelector(".cm-lintRange-error")).toBeNull();
    expect(container.querySelector(".cm-lintRange-warning")).toBeNull();
  });

  it("renders a diagnostic marker per entry in diagnosticErrors, with each entry's own severity", () => {
    const { container } = renderEditor({
      value: "const a: string = 1;\nconsole.log(a);",
      diagnosticErrors: [
        { message: "Type mismatch", line: 1, column: 1, severity: "error" },
        { message: "Unused import", line: 2, column: 1, severity: "warning" },
      ],
    });

    expect(container.querySelector(".cm-lintRange-error")).not.toBeNull();
    expect(container.querySelector(".cm-lintRange-warning")).not.toBeNull();
  });

  it("merges diagnosticError and diagnosticErrors into a single diagnostics set", () => {
    const { container } = renderEditor({
      value: ".a {\n  color: red\n}",
      diagnosticError: { message: "boom", line: 1 },
      diagnosticErrors: [{ message: "warn", line: 2, severity: "warning" }],
    });

    expect(container.querySelector(".cm-lintRange-error")).not.toBeNull();
    expect(container.querySelector(".cm-lintRange-warning")).not.toBeNull();
  });

  it("renders as read-only and does not call onChange when the user types, when readOnly is true", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor({ value: "fixed", readOnly: true });

    const textbox = screen.getByRole("textbox", { name: "HTML source" });
    await user.click(textbox);
    await user.keyboard("more text");

    expect(onChange).not.toHaveBeenCalled();
    expect(textbox).toHaveTextContent("fixed");
  });
});
