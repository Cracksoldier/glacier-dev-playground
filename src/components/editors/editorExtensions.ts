import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { sass } from "@codemirror/lang-sass";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import type { ScriptLanguage, StylesheetLanguage } from "../../models/project";

/** Which of the three fixed editor panels an instance belongs to. */
export type EditorLanguageKind = "html" | "css" | "javascript";

export interface EditorPreferences {
  fontSize: number;
  tabWidth: number;
  wordWrap: boolean;
  lineNumbers: boolean;
}

export interface LanguageVariant {
  stylesheetLanguage?: StylesheetLanguage;
  scriptLanguage?: ScriptLanguage;
}

/**
 * Extensions common to all three editors: history, indentation, bracket
 * matching, autocompletion, search, and the keymaps that back them. Line
 * numbers and word wrap live in {@link buildPreferencesExtensions} instead,
 * since both are user-toggleable preferences rather than fixed behavior.
 */
export function buildSharedExtensions(): Extension[] {
  return [
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...completionKeymap,
      ...defaultKeymap,
      indentWithTab,
    ]),
  ];
}

/**
 * Language support per panel. SCSS uses `@codemirror/lang-sass`, whose
 * `sass()` parses the brace/semicolon SCSS syntax by default (`indented:
 * false`), so nesting, variables, and mixins highlight properly; plain CSS
 * uses `@codemirror/lang-css`. Compilation happens elsewhere (the SCSS worker).
 */
export function buildLanguageExtensions(
  kind: EditorLanguageKind,
  variant: LanguageVariant,
): Extension[] {
  switch (kind) {
    case "html":
      return [html()];
    case "css":
      return [variant.stylesheetLanguage === "scss" ? sass() : css()];
    case "javascript":
      return [
        javascript({
          typescript: variant.scriptLanguage === "typescript",
          jsx: false,
        }),
      ];
    default: {
      const exhaustiveCheck: never = kind;
      return exhaustiveCheck;
    }
  }
}

export function buildPreferencesExtensions(
  preferences: EditorPreferences,
): Extension[] {
  const extensions: Extension[] = [
    EditorView.theme({
      "&": { fontSize: `${preferences.fontSize}px` },
    }),
    EditorState.tabSize.of(preferences.tabWidth),
    indentUnit.of(" ".repeat(preferences.tabWidth)),
  ];

  if (preferences.wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }
  if (preferences.lineNumbers) {
    extensions.push(lineNumbers());
  }

  return extensions;
}
