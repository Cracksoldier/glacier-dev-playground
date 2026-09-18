import { type Ref, useMemo } from "react";
import type { EditorPreferences } from "../../preferences/editorPreferences";
import { useProjectStore } from "../../store/ProjectStoreContext";
import CodeMirrorEditor, {
  type CodeMirrorEditorHandle,
} from "./CodeMirrorEditor";
import styles from "./EditorPanel.module.css";
import { buildLanguageExtensions } from "./editorExtensions";

interface HtmlEditorPanelProps {
  preferences: EditorPreferences;
  hasError?: boolean;
  ref?: Ref<CodeMirrorEditorHandle>;
}

function HtmlEditorPanel({ preferences, hasError, ref }: HtmlEditorPanelProps) {
  const { activeProject, actions } = useProjectStore();
  const languageExtensions = useMemo(
    () => buildLanguageExtensions("html", {}),
    [],
  );

  return (
    <section className={styles.panel} aria-label="HTML editor">
      <div className={styles.header}>
        <span className={styles.label}>
          HTML
          {hasError && (
            <>
              <span className={styles.errorBadge} aria-hidden="true" />
              <span className={styles.srOnly}>Contains an error</span>
            </>
          )}
        </span>
      </div>
      <div className={styles.body}>
        <CodeMirrorEditor
          key={activeProject.id}
          value={activeProject.source.html}
          onChange={(html) =>
            actions.updateProjectSource(activeProject.id, { html })
          }
          languageExtensions={languageExtensions}
          preferences={preferences}
          ariaLabel="HTML source"
          ref={ref}
        />
      </div>
    </section>
  );
}

export default HtmlEditorPanel;
