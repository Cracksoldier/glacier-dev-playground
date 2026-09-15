import { type Ref, useMemo } from "react";
import type { ExecutionMode, ScriptLanguage } from "../../models/project";
import type { EditorPreferences } from "../../preferences/editorPreferences";
import { useProjectStore } from "../../store/ProjectStoreContext";
import CodeMirrorEditor, {
  type CodeMirrorEditorHandle,
} from "./CodeMirrorEditor";
import styles from "./EditorPanel.module.css";
import { buildLanguageExtensions } from "./editorExtensions";

interface JsEditorPanelProps {
  preferences: EditorPreferences;
  ref?: Ref<CodeMirrorEditorHandle>;
}

function isScriptLanguage(value: string): value is ScriptLanguage {
  return value === "javascript" || value === "typescript";
}

function isExecutionMode(value: string): value is ExecutionMode {
  return value === "classic" || value === "module";
}

function JsEditorPanel({ preferences, ref }: JsEditorPanelProps) {
  const { activeProject, actions } = useProjectStore();
  const { scriptLanguage, executionMode } = activeProject.source;
  const languageExtensions = useMemo(
    () => buildLanguageExtensions("javascript", { scriptLanguage }),
    [scriptLanguage],
  );

  return (
    <section className={styles.panel} aria-label="JavaScript editor">
      <div className={styles.header}>
        <span className={styles.label}>Script</span>
        <div className={styles.selectors}>
          <select
            className={styles.select}
            aria-label="Script language"
            value={scriptLanguage}
            onChange={(event) => {
              const { value } = event.target;
              if (!isScriptLanguage(value)) return;
              actions.updateProjectSource(activeProject.id, {
                scriptLanguage: value,
              });
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
          </select>
          <select
            className={styles.select}
            aria-label="Execution mode"
            value={executionMode}
            onChange={(event) => {
              const { value } = event.target;
              if (!isExecutionMode(value)) return;
              actions.updateProjectSource(activeProject.id, {
                executionMode: value,
              });
            }}
          >
            <option value="classic">Classic</option>
            <option value="module">Module</option>
          </select>
        </div>
      </div>
      <div className={styles.body}>
        <CodeMirrorEditor
          key={activeProject.id}
          value={activeProject.source.script}
          onChange={(script) =>
            actions.updateProjectSource(activeProject.id, { script })
          }
          languageExtensions={languageExtensions}
          preferences={preferences}
          ariaLabel="Script source"
          ref={ref}
        />
      </div>
    </section>
  );
}

export default JsEditorPanel;
