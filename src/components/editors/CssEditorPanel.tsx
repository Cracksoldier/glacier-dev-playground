import { type Ref, useId, useMemo, useState } from "react";
import { WarningIcon } from "../../components/common/icons";
import type { StylesheetLanguage } from "../../models/project";
import type { EditorPreferences } from "../../preferences/editorPreferences";
import { useProjectStore } from "../../store/ProjectStoreContext";
import CodeMirrorEditor, {
  type CodeMirrorEditorDiagnosticError,
  type CodeMirrorEditorHandle,
} from "./CodeMirrorEditor";
import styles from "./EditorPanel.module.css";
import { buildLanguageExtensions } from "./editorExtensions";

type StylesheetView = "source" | "compiled";

interface CssEditorPanelProps {
  preferences: EditorPreferences;
  hasError?: boolean;
  /** A compile-time SCSS error to surface as a CodeMirror diagnostic in the Source view. */
  diagnosticError?: CodeMirrorEditorDiagnosticError | null;
  /** The most recently compiled CSS, shown read-only in the Compiled view. */
  compiledCss?: string | null;
  /** True when the last SCSS compile failed — the compiled output shown is stale relative to the current source. */
  isStale?: boolean;
  ref?: Ref<CodeMirrorEditorHandle>;
}

function isStylesheetLanguage(value: string): value is StylesheetLanguage {
  return value === "css" || value === "scss";
}

function CssEditorPanel({
  preferences,
  hasError,
  diagnosticError = null,
  compiledCss = null,
  isStale = false,
  ref,
}: CssEditorPanelProps) {
  const { activeProject, actions } = useProjectStore();
  const headingId = useId();
  const { stylesheetLanguage } = activeProject.source;
  const isScss = stylesheetLanguage === "scss";
  const [view, setView] = useState<StylesheetView>("source");
  // The toggle only exists in SCSS mode — if the language is switched back to
  // CSS while "compiled" is selected, fall back to "source" rather than
  // showing a stale/empty compiled view with no toggle to leave it from.
  const effectiveView = isScss ? view : "source";
  // buildLanguageExtensions("css", ...) is identical regardless of variant
  // (no dedicated brace-syntax SCSS package exists), so this never needs to
  // change for a live editor instance.
  const languageExtensions = useMemo(
    () => buildLanguageExtensions("css", {}),
    [],
  );

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.label}>
          Stylesheet
          {hasError && (
            <>
              <span className={styles.errorBadge} aria-hidden="true" />
              <span className="glacier-visually-hidden">Contains an error</span>
            </>
          )}
        </h2>
        <div className={styles.selectors}>
          {isScss && (
            <fieldset className={styles.toggleGroup}>
              <legend className="glacier-visually-hidden">
                Stylesheet view
              </legend>
              <button
                type="button"
                className={styles.toggleButton}
                aria-pressed={effectiveView === "source"}
                onClick={() => setView("source")}
              >
                Source
              </button>
              <button
                type="button"
                className={styles.toggleButton}
                aria-pressed={effectiveView === "compiled"}
                onClick={() => setView("compiled")}
              >
                Compiled
              </button>
            </fieldset>
          )}
          <select
            className={styles.select}
            aria-label="Stylesheet language"
            value={stylesheetLanguage}
            onChange={(event) => {
              const { value } = event.target;
              if (!isStylesheetLanguage(value)) return;
              actions.updateProjectSource(activeProject.id, {
                stylesheetLanguage: value,
              });
            }}
          >
            <option value="css">CSS</option>
            <option value="scss">SCSS</option>
          </select>
        </div>
      </div>
      {isScss && isStale && (
        <div className={styles.warning} role="status">
          <WarningIcon />
          <p className={styles.warningMessage}>
            SCSS compile failed — showing the last successful output.
          </p>
        </div>
      )}
      <div className={styles.body}>
        {effectiveView === "source" ? (
          <CodeMirrorEditor
            key={activeProject.id}
            value={activeProject.source.stylesheet}
            onChange={(stylesheet) =>
              actions.updateProjectSource(activeProject.id, { stylesheet })
            }
            languageExtensions={languageExtensions}
            preferences={preferences}
            ariaLabel="Stylesheet source"
            diagnosticError={diagnosticError}
            ref={ref}
          />
        ) : (
          <CodeMirrorEditor
            key={`${activeProject.id}-compiled`}
            value={compiledCss ?? ""}
            onChange={() => {}}
            languageExtensions={languageExtensions}
            preferences={preferences}
            ariaLabel="Compiled CSS output"
            readOnly
          />
        )}
      </div>
    </section>
  );
}

export default CssEditorPanel;
