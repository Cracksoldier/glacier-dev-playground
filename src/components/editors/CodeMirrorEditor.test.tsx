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
});
