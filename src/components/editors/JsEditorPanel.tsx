import { type Ref, useMemo } from "react";
import { WarningIcon } from "../../components/common/icons";
import type { ExecutionMode, ScriptLanguage } from "../../models/project";
import type { EditorPreferences } from "../../preferences/editorPreferences";
import { useProjectStore } from "../../store/ProjectStoreContext";
import CodeMirrorEditor, {
  type CodeMirrorEditorDiagnostic,
  type CodeMirrorEditorHandle,
} from "./CodeMirrorEditor";
import styles from "./EditorPanel.module.css";
import { buildLanguageExtensions } from "./editorExtensions";

interface JsEditorPanelProps {
  preferences: EditorPreferences;
  hasError?: boolean;
  /** TS/JS compiler-reported diagnostics to surface as CodeMirror markers. */
  diagnosticErrors?: CodeMirrorEditorDiagnostic[] | null;
  /** True when the last TS/JS compile produced a blocking diagnostic — the diagnostics shown are stale relative to the current source. */
  isStale?: boolean;
  ref?: Ref<CodeMirrorEditorHandle>;
}

function isScriptLanguage(value: string): value is ScriptLanguage {
  return value === "javascript" || value === "typescript";
}

function isExecutionMode(value: string): value is ExecutionMode {
  return value === "classic" || value === "module";
}

function JsEditorPanel({
  preferences,
  hasError,
  diagnosticErrors = null,
  isStale = false,
  ref,
}: JsEditorPanelProps) {
  const { activeProject, actions } = useProjectStore();
  const { scriptLanguage, executionMode } = activeProject.source;
  const languageExtensions = useMemo(
    () => buildLanguageExtensions("javascript", { scriptLanguage }),
    [scriptLanguage],
  );
  const scriptLanguageLabel =
    scriptLanguage === "typescript" ? "TypeScript" : "JavaScript";

  return (
    <section className={styles.panel} aria-label="JavaScript editor">
      <div className={styles.header}>
        <span className={styles.label}>
          Script
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
      {isStale && (
        <div className={styles.warning} role="status">
          <WarningIcon />
          <p className={styles.warningMessage}>
            {scriptLanguageLabel} compile failed — showing the last successful
            output.
          </p>
        </div>
      )}
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
          diagnosticErrors={diagnosticErrors}
          ref={ref}
        />
      </div>
    </section>
  );
}

export default JsEditorPanel;
