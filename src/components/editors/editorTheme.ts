import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/**
 * Hand-authored theme using `var(--glacier-*)` custom properties instead of
 * a packaged CodeMirror theme, so colors stay live against
 * `src/styles/tokens.css` with no extra dependency and no light-theme risk
 * (this app is dark-only).
 */
const glacierEditorViewTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      color: "var(--glacier-text-primary)",
      backgroundColor: "transparent",
      fontFamily: "var(--glacier-font-mono)",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
    },
    ".cm-content": {
      caretColor: "var(--glacier-accent-cyan)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--glacier-accent-cyan)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgb(79 216 242 / 25%)",
      },
    // The line-number gutter is its own tinted column with a divider, so the
    // numbers never read as part of the code.
    ".cm-gutters": {
      // `--glacier-bg-sunken` at partial alpha, so the panel's frosted
      // background still shows through.
      backgroundColor: "rgb(6 10 18 / 45%)",
      color: "var(--glacier-text-muted)",
      border: "none",
      borderRight: "1px solid var(--glacier-panel-border)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "2ch",
      padding: "0 var(--glacier-space-3)",
    },
    ".cm-line": {
      padding: "0 var(--glacier-space-2) 0 var(--glacier-space-3)",
    },
    // The global `:focus-visible` ring would be drawn around `.cm-content`,
    // but the scroller clips all of it except a stray bar against the gutter.
    // Focus is shown on the gutter divider instead — or, with line numbers
    // off, as an inset bar on the editor's left edge.
    ".cm-content:focus-visible": {
      boxShadow: "none",
    },
    "&.cm-focused .cm-gutters": {
      borderRightColor: "var(--glacier-accent-cyan)",
    },
    "&.cm-focused:not(:has(.cm-gutters))": {
      boxShadow: "inset 2px 0 0 var(--glacier-accent-cyan)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgb(120 170 220 / 6%)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgb(120 170 220 / 10%)",
      color: "var(--glacier-text-secondary)",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "rgb(79 216 242 / 20%)",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgb(242 200 111 / 25%)",
    },
    ".cm-searchMatch-selected": {
      backgroundColor: "rgb(242 200 111 / 45%)",
    },
  },
  { dark: true },
);

const glacierHighlightStyle = HighlightStyle.define([
  {
    tag: tags.comment,
    color: "var(--glacier-text-muted)",
    fontStyle: "italic",
  },
  {
    tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword],
    color: "var(--glacier-accent-violet)",
  },
  {
    tag: [tags.string, tags.special(tags.string)],
    color: "var(--glacier-status-success)",
  },
  {
    tag: [tags.number, tags.bool, tags.null],
    color: "var(--glacier-accent-mint)",
  },
  {
    tag: [tags.definition(tags.variableName), tags.function(tags.variableName)],
    color: "var(--glacier-accent-cyan-strong)",
  },
  { tag: tags.variableName, color: "var(--glacier-text-primary)" },
  {
    tag: [tags.propertyName, tags.attributeName],
    color: "var(--glacier-accent-cyan)",
  },
  {
    tag: [tags.typeName, tags.className],
    color: "var(--glacier-status-warning)",
  },
  { tag: tags.tagName, color: "var(--glacier-accent-violet)" },
  { tag: tags.angleBracket, color: "var(--glacier-text-secondary)" },
  { tag: tags.operator, color: "var(--glacier-text-secondary)" },
  { tag: tags.punctuation, color: "var(--glacier-text-secondary)" },
  { tag: tags.invalid, color: "var(--glacier-status-danger)" },
]);

export const glacierEditorTheme: Extension[] = [
  glacierEditorViewTheme,
  syntaxHighlighting(glacierHighlightStyle),
];
