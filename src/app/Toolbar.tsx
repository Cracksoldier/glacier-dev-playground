import { type ReactElement, useId, useRef, useState } from "react";
import GlacierMark from "../components/common/GlacierMark";
import {
  AutoRunIcon,
  EditorPreferencesIcon,
  ExportIcon,
  type IconProps,
  ImportIcon,
  NewProjectIcon,
  ProjectSwitcherIcon,
  ResetIcon,
  ResourcesIcon,
  RunIcon,
  SaveStatusIcon,
  SettingsIcon,
  WarningIcon,
} from "../components/common/icons";
import NewProjectDialog from "../components/projects/NewProjectDialog";
import ProjectSwitcherPopover from "../components/projects/ProjectSwitcherPopover";
import ResetProjectDialog from "../components/projects/ResetProjectDialog";
import type { SaveStatus } from "../models/saveStatus";
import type { EditorPreferences } from "../preferences/editorPreferences";
import { useProjectStore } from "../store/ProjectStoreContext";
import EditorPreferencesPopover from "./EditorPreferencesPopover";
import styles from "./Toolbar.module.css";

interface ToolbarAction {
  name: string;
  Icon: (props: IconProps) => ReactElement;
}

const MIDDLE_DISABLED_ACTIONS: ToolbarAction[] = [
  { name: "Resources", Icon: ResourcesIcon },
  { name: "Import", Icon: ImportIcon },
  { name: "Export", Icon: ExportIcon },
];

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saving: "Saving…",
  saved: "Saved",
  "save-failed": "Save failed",
  "storage-unavailable": "Storage unavailable",
};

interface ToolbarProps {
  editorPreferences: EditorPreferences;
  onUpdateEditorPreferences: (partial: Partial<EditorPreferences>) => void;
  onRun: () => void;
}

function Toolbar({
  editorPreferences,
  onUpdateEditorPreferences,
  onRun,
}: ToolbarProps) {
  const disabledHintId = useId();
  const { activeProject, saveStatus, actions } = useProjectStore();
  const switchButtonRef = useRef<HTMLButtonElement>(null);
  const editorPreferencesButtonRef = useRef<HTMLButtonElement>(null);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const [isNewProjectOpen, setNewProjectOpen] = useState(false);
  const [isResetOpen, setResetOpen] = useState(false);
  const [isEditorPreferencesOpen, setEditorPreferencesOpen] = useState(false);

  const isSaveStatusError =
    saveStatus === "save-failed" || saveStatus === "storage-unavailable";

  return (
    <div className={styles.toolbar}>
      <div className={styles.brand}>
        <GlacierMark size={28} />
        <div className={styles.wordmark}>
          <h1 className={styles.title}>GLACIER</h1>
          <p className={styles.subtitle}>DEV PLAYGROUND</p>
        </div>
      </div>
      <p className={styles.projectTitle}>{activeProject.title}</p>
      <div className={styles.actions}>
        <button
          ref={switchButtonRef}
          type="button"
          className={styles.button}
          aria-label="Switch project"
          aria-haspopup="menu"
          aria-expanded={isSwitcherOpen}
          title="Switch project"
          onClick={() => setSwitcherOpen((open) => !open)}
        >
          <ProjectSwitcherIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label="New project"
          title="New project"
          onClick={() => setNewProjectOpen(true)}
        >
          <NewProjectIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label="Run"
          title="Run"
          onClick={onRun}
        >
          <RunIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label="Auto-run"
          aria-pressed={activeProject.settings.autoRun}
          title="Auto-run"
          onClick={() =>
            actions.updateProjectSettings(activeProject.id, {
              autoRun: !activeProject.settings.autoRun,
            })
          }
        >
          <AutoRunIcon />
        </button>
        {MIDDLE_DISABLED_ACTIONS.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            className={styles.button}
            aria-disabled="true"
            aria-describedby={disabledHintId}
            aria-label={name}
            title={name}
          >
            <Icon />
          </button>
        ))}
        <button
          type="button"
          className={styles.button}
          aria-label="Reset"
          title="Reset"
          onClick={() => setResetOpen(true)}
        >
          <ResetIcon />
        </button>
        <button
          ref={editorPreferencesButtonRef}
          type="button"
          className={styles.button}
          aria-label="Editor preferences"
          aria-haspopup="menu"
          aria-expanded={isEditorPreferencesOpen}
          title="Editor preferences"
          onClick={() => setEditorPreferencesOpen((open) => !open)}
        >
          <EditorPreferencesIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-disabled="true"
          aria-describedby={disabledHintId}
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon />
        </button>
        <span id={disabledHintId} hidden>
          Coming in a later milestone
        </span>
      </div>
      <div className={styles.status} role="status">
        {isSaveStatusError ? <WarningIcon /> : <SaveStatusIcon />}
        {SAVE_STATUS_LABEL[saveStatus]}
      </div>
      <ProjectSwitcherPopover
        isOpen={isSwitcherOpen}
        onClose={() => setSwitcherOpen(false)}
        anchorRef={switchButtonRef}
      />
      <NewProjectDialog
        isOpen={isNewProjectOpen}
        onClose={() => setNewProjectOpen(false)}
      />
      <ResetProjectDialog
        isOpen={isResetOpen}
        projectId={activeProject.id}
        onClose={() => setResetOpen(false)}
      />
      <EditorPreferencesPopover
        isOpen={isEditorPreferencesOpen}
        onClose={() => setEditorPreferencesOpen(false)}
        anchorRef={editorPreferencesButtonRef}
        preferences={editorPreferences}
        onUpdatePreferences={onUpdateEditorPreferences}
      />
    </div>
  );
}

export default Toolbar;
