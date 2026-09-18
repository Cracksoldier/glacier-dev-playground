import { type Ref, useMemo } from "react";
import type { StylesheetLanguage } from "../../models/project";
import type { EditorPreferences } from "../../preferences/editorPreferences";
import { useProjectStore } from "../../store/ProjectStoreContext";
import CodeMirrorEditor, {
  type CodeMirrorEditorHandle,
} from "./CodeMirrorEditor";
import styles from "./EditorPanel.module.css";
import { buildLanguageExtensions } from "./editorExtensions";

interface CssEditorPanelProps {
  preferences: EditorPreferences;
  hasError?: boolean;
  ref?: Ref<CodeMirrorEditorHandle>;
}

function isStylesheetLanguage(value: string): value is StylesheetLanguage {
  return value === "css" || value === "scss";
}

function CssEditorPanel({ preferences, hasError, ref }: CssEditorPanelProps) {
  const { activeProject, actions } = useProjectStore();
  const { stylesheetLanguage } = activeProject.source;
  // buildLanguageExtensions("css", ...) is identical regardless of variant
  // (no dedicated brace-syntax SCSS package exists), so this never needs to
  // change for a live editor instance.
  const languageExtensions = useMemo(
    () => buildLanguageExtensions("css", {}),
    [],
  );

  return (
    <section className={styles.panel} aria-label="CSS editor">
      <div className={styles.header}>
        <span className={styles.label}>
          Stylesheet
          {hasError && (
            <>
              <span className={styles.errorBadge} aria-hidden="true" />
              <span className={styles.srOnly}>Contains an error</span>
            </>
          )}
        </span>
        <div className={styles.selectors}>
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
      <div className={styles.body}>
        <CodeMirrorEditor
          key={activeProject.id}
          value={activeProject.source.stylesheet}
          onChange={(stylesheet) =>
            actions.updateProjectSource(activeProject.id, { stylesheet })
          }
          languageExtensions={languageExtensions}
          preferences={preferences}
          ariaLabel="Stylesheet source"
          ref={ref}
        />
      </div>
    </section>
  );
}

export default CssEditorPanel;
