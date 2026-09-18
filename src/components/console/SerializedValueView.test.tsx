import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { SerializedValue } from "../../preview/previewMessage";
import SerializedValueView from "./SerializedValueView";

describe("SerializedValueView", () => {
  it("renders a string primitive quoted", () => {
    render(<SerializedValueView value={{ kind: "primitive", value: "hi" }} />);
    expect(screen.getByText('"hi"')).toBeInTheDocument();
  });

  it("renders a number primitive unquoted", () => {
    render(<SerializedValueView value={{ kind: "primitive", value: 42 }} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders null as the literal text 'null'", () => {
    render(<SerializedValueView value={{ kind: "primitive", value: null }} />);
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("renders an empty array inline without an expander", () => {
    render(
      <SerializedValueView
        value={{ kind: "array", items: [], truncated: false }}
      />,
    );
    expect(screen.getByText("[]")).toBeInTheDocument();
    expect(document.querySelector("details")).not.toBeInTheDocument();
  });

  it("renders a non-empty array behind a collapsed expander showing its item count", () => {
    const value: SerializedValue = {
      kind: "array",
      items: [
        { kind: "primitive", value: 1 },
        { kind: "primitive", value: 2 },
      ],
      truncated: false,
    };
    render(<SerializedValueView value={value} />);

    expect(screen.getByText("Array(2)")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeVisible();
  });

  it("expands an array to reveal its items on click", async () => {
    const user = userEvent.setup();
    const value: SerializedValue = {
      kind: "array",
      items: [{ kind: "primitive", value: "x" }],
      truncated: false,
    };
    render(<SerializedValueView value={value} />);

    await user.click(screen.getByText("Array(1)"));

    expect(screen.getByText('"x"')).toBeVisible();
  });

  it("shows a truncation marker for a truncated array", () => {
    const value: SerializedValue = {
      kind: "array",
      items: [{ kind: "primitive", value: 1 }],
      truncated: true,
    };
    render(<SerializedValueView value={value} />);

    expect(screen.getByText("Array(1+)")).toBeInTheDocument();
    expect(screen.getByText("… truncated")).toBeInTheDocument();
  });

  it("renders an empty object inline without an expander", () => {
    render(
      <SerializedValueView
        value={{ kind: "object", entries: [], truncated: false }}
      />,
    );
    expect(screen.getByText("{}")).toBeInTheDocument();
  });

  it("renders object entries with their keys behind an expander", async () => {
    const user = userEvent.setup();
    const value: SerializedValue = {
      kind: "object",
      entries: [["name", { kind: "primitive", value: "Ada" }]],
      truncated: false,
    };
    render(<SerializedValueView value={value} />);

    await user.click(screen.getByText("Object(1)"));

    expect(screen.getByText("name:")).toBeVisible();
    expect(screen.getByText('"Ada"')).toBeVisible();
  });

  it("renders an error's name and message", () => {
    render(
      <SerializedValueView
        value={{ kind: "error", name: "TypeError", message: "bad" }}
      />,
    );
    expect(screen.getByText("TypeError: bad")).toBeInTheDocument();
  });

  it("renders an error's stack behind its own expander when present", () => {
    render(
      <SerializedValueView
        value={{
          kind: "error",
          name: "Error",
          message: "boom",
          stack: "Error: boom\n  at x",
        }}
      />,
    );
    expect(screen.getByText("stack")).toBeInTheDocument();
  });

  it("renders a DOM node descriptor as a tag-like string", () => {
    render(
      <SerializedValueView
        value={{
          kind: "node",
          tagName: "div",
          id: "widget",
          className: "card",
          preview: '<div id="widget" class="card"></div>',
        }}
      />,
    );
    expect(
      screen.getByText('<div id="widget" class="card">'),
    ).toBeInTheDocument();
  });

  it("renders a function descriptor with its name", () => {
    render(<SerializedValueView value={{ kind: "function", name: "myFn" }} />);
    expect(screen.getByText("ƒ myFn()")).toBeInTheDocument();
  });

  it("renders an anonymous function descriptor", () => {
    render(<SerializedValueView value={{ kind: "function", name: "" }} />);
    expect(screen.getByText("ƒ (anonymous)()")).toBeInTheDocument();
  });

  it("renders a circular reference marker", () => {
    render(<SerializedValueView value={{ kind: "circular" }} />);
    expect(screen.getByText("[Circular]")).toBeInTheDocument();
  });

  it("renders an unsupported value's type tag", () => {
    render(
      <SerializedValueView value={{ kind: "unsupported", tag: "symbol" }} />,
    );
    expect(screen.getByText("[symbol]")).toBeInTheDocument();
  });
});
