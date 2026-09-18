import {
  Annotation,
  Compartment,
  EditorState,
  type Extension,
} from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import styles from "./EditorPanel.module.css";
import {
  buildPreferencesExtensions,
  buildSharedExtensions,
  type EditorPreferences,
} from "./editorExtensions";
import { glacierEditorTheme } from "./editorTheme";

export interface CodeMirrorEditorHandle {
  focus: () => void;
  /** Moves the cursor to the start of `line` (1-indexed, clamped to the document's line range), scrolls it into view, and focuses the editor. */
  focusLine: (line: number) => void;
}

/**
 * Tags transactions dispatched by the external-value-sync effect so the
 * update listener can skip them. Without this, a programmatic doc
 * replacement (e.g. project reset while staying on the same project) would
 * echo back through `onChange` into the store as a redundant update — still
 * loop-free (the next sync effect run is a no-op once doc matches `value`),
 * but pointlessly re-dispatches a store action for content that didn't
 * originate from the user.
 */
const externalChange = Annotation.define<boolean>();

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  languageExtensions: Extension[];
  preferences: EditorPreferences;
  ariaLabel: string;
  ref?: Ref<CodeMirrorEditorHandle>;
}

/**
 * Store-agnostic CodeMirror 6 integration. Owns the `EditorView` lifecycle
 * for the lifetime of this component instance: the parent is expected to
 * `key` this component on project id so switching projects remounts it
 * (fresh `EditorState`, fresh undo history) rather than this component
 * trying to detect and react to project switches itself.
 *
 * `value` is applied to the document only when it differs from the current
 * doc text, so the editor's own `onChange` round-tripping through the
 * project store back into `value` is a no-op — this is what avoids a
 * dispatch feedback loop between CodeMirror and the store.
 */
function CodeMirrorEditor({
  value,
  onChange,
  languageExtensions,
  preferences,
  ariaLabel,
  ref,
}: CodeMirrorEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Tracks the most recent value this component itself emitted via
  // `onChange`. The `value` prop round-trips back through the store
  // asynchronously (React state update -> re-render), so by the time it
  // arrives here it may already be stale relative to the live doc if the
  // user typed further keystrokes in the meantime — comparing against this
  // ref (not `view.state.doc`) is what tells a genuinely external value
  // change (project reset, imported content) apart from our own echo.
  const lastEmittedRef = useRef(value);
  const languageCompartment = useRef(new Compartment());
  const preferencesCompartment = useRef(new Compartment());
  const diagnosticsCompartment = useRef(new Compartment());

  useImperativeHandle(
    ref,
    () => ({
      focus: () => viewRef.current?.focus(),
      focusLine: (line) => {
        const view = viewRef.current;
        if (!view) return;
        const clampedLine = Math.min(Math.max(line, 1), view.state.doc.lines);
        const pos = view.state.doc.line(clampedLine).from;
        view.dispatch({
          selection: { anchor: pos },
          effects: EditorView.scrollIntoView(pos, { y: "center" }),
        });
        view.focus();
      },
    }),
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design; value/preferences/languageExtensions/ariaLabel are handled by dedicated effects below or are immutable for this instance's lifetime.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          buildSharedExtensions(),
          languageCompartment.current.of(languageExtensions),
          glacierEditorTheme,
          preferencesCompartment.current.of(
            buildPreferencesExtensions(preferences),
          ),
          diagnosticsCompartment.current.of([]),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const isExternal = update.transactions.some((tr) =>
              tr.annotation(externalChange),
            );
            if (isExternal) return;
            const next = update.state.doc.toString();
            lastEmittedRef.current = next;
            onChangeRef.current(next);
          }),
        ],
      }),
      parent: host,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally mount-only: `ariaLabel` is fixed for this panel's
    // lifetime, `value`/`preferences`/`languageExtensions` changes are
    // handled by the dedicated effects below, and the parent remounts this
    // component (via `key={activeProject.id}`) on project switch rather than
    // this effect reacting to it.
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // `value` is just the store echoing our own last-emitted change back —
    // not a genuinely external update — so it must not overwrite whatever
    // the user has typed into the live doc since then.
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    if (view.state.doc.toString() === value) return;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: externalChange.of(true),
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: preferencesCompartment.current.reconfigure(
        buildPreferencesExtensions(preferences),
      ),
    });
  }, [preferences]);

  // Reconfigures in place (no remount, undo history preserved) — needed
  // because a language variant (e.g. JS -> TS) can change while staying on
  // the same project, unlike a project switch which remounts via `key`.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: languageCompartment.current.reconfigure(languageExtensions),
    });
  }, [languageExtensions]);

  return <div ref={hostRef} className={styles.codeMirrorHost} />;
}

export default CodeMirrorEditor;
