import { lazy, Suspense, useId, useState } from "react";
import GlacierMark from "../components/common/GlacierMark";
import {
  AutoRunIcon,
  EditorPreferencesIcon,
  ExportIcon,
  ImportIcon,
  KeyboardIcon,
  LayoutDefaultIcon,
  LayoutPreviewIcon,
  LayoutSideIcon,
  NewProjectIcon,
  ProjectSwitcherIcon,
  ResetIcon,
  ResourcesIcon,
  RunIcon,
  SaveStatusIcon,
  SettingsIcon,
  WarningIcon,
} from "../components/common/icons";
import KeyboardHelpDialog from "../components/common/KeyboardHelpDialog";
import NewProjectDialog from "../components/projects/NewProjectDialog";
import ProjectSwitcherDialog from "../components/projects/ProjectSwitcherDialog";
import ResetProjectDialog from "../components/projects/ResetProjectDialog";
import type { SaveStatus } from "../models/saveStatus";
import type { EditorPreferences } from "../preferences/editorPreferences";
import type { WorkspaceLayout } from "../preferences/workspaceLayoutPreferences";
import { useProjectStore } from "../store/ProjectStoreContext";
import EditorPreferencesDialog from "./EditorPreferencesDialog";
import styles from "./Toolbar.module.css";

// Code-split: the spec names the import/export dialogs and the resource
// manager as lazy-load candidates. Only these three are split — the remaining
// dialogs are small, and deferring them would make `getByRole` assertions
// immediately after a click resolve a tick too late.
const ResourceManagerDialog = lazy(
  () => import("../components/resources/ResourceManagerDialog"),
);
const ImportDialog = lazy(
  () => import("../components/import-export/ImportDialog"),
);
const ExportDialog = lazy(
  () => import("../components/import-export/ExportDialog"),
);

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saving: "Saving…",
  saved: "Saved",
  "save-failed": "Save failed",
  "storage-unavailable": "Storage unavailable",
};

const WORKSPACE_LAYOUT_OPTIONS: readonly {
  layout: WorkspaceLayout;
  label: string;
  Icon: typeof LayoutDefaultIcon;
}[] = [
  { layout: "default", label: "Default layout", Icon: LayoutDefaultIcon },
  { layout: "side", label: "Side layout", Icon: LayoutSideIcon },
  { layout: "preview", label: "Preview only", Icon: LayoutPreviewIcon },
];

interface ToolbarProps {
  editorPreferences: EditorPreferences;
  onUpdateEditorPreferences: (partial: Partial<EditorPreferences>) => void;
  onRun: () => void;
  workspaceLayout: WorkspaceLayout;
  onWorkspaceLayoutChange: (layout: WorkspaceLayout) => void;
}

function Toolbar({
  editorPreferences,
  onUpdateEditorPreferences,
  onRun,
  workspaceLayout,
  onWorkspaceLayoutChange,
}: ToolbarProps) {
  const disabledHintId = useId();
  const { activeProject, saveStatus, actions } = useProjectStore();
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const [isNewProjectOpen, setNewProjectOpen] = useState(false);
  const [isResetOpen, setResetOpen] = useState(false);
  const [isEditorPreferencesOpen, setEditorPreferencesOpen] = useState(false);
  const [isResourcesOpen, setResourcesOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [isExportOpen, setExportOpen] = useState(false);
  const [isKeyboardHelpOpen, setKeyboardHelpOpen] = useState(false);

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
          type="button"
          className={styles.button}
          aria-label="Switch project"
          title="Switch project"
          onClick={() => setSwitcherOpen(true)}
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
        <fieldset aria-label="Workspace layout" className={styles.layoutGroup}>
          {WORKSPACE_LAYOUT_OPTIONS.map(({ layout, label, Icon }) => (
            <button
              key={layout}
              type="button"
              className={styles.button}
              aria-label={label}
              aria-pressed={workspaceLayout === layout}
              title={label}
              onClick={() => onWorkspaceLayoutChange(layout)}
            >
              <Icon />
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          className={styles.button}
          aria-label="Resources"
          title="Resources"
          onClick={() => setResourcesOpen(true)}
        >
          <ResourcesIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label="Import"
          title="Import"
          onClick={() => setImportOpen(true)}
        >
          <ImportIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label="Export"
          title="Export"
          onClick={() => setExportOpen(true)}
        >
          <ExportIcon />
        </button>
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
          type="button"
          className={styles.button}
          aria-label="Editor preferences"
          title="Editor preferences"
          onClick={() => setEditorPreferencesOpen(true)}
        >
          <EditorPreferencesIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          onClick={() => setKeyboardHelpOpen(true)}
        >
          <KeyboardIcon />
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
      <ProjectSwitcherDialog
        isOpen={isSwitcherOpen}
        onClose={() => setSwitcherOpen(false)}
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
      {/* The three code-split dialogs are mounted only while open. Rendering
          them unconditionally would resolve their chunks on first paint and
          undo the split. */}
      {isResourcesOpen && (
        <Suspense fallback={null}>
          <ResourceManagerDialog
            isOpen
            onClose={() => setResourcesOpen(false)}
          />
        </Suspense>
      )}
      {isImportOpen && (
        <Suspense fallback={null}>
          <ImportDialog isOpen onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
      {isExportOpen && (
        <Suspense fallback={null}>
          <ExportDialog
            isOpen
            onClose={() => setExportOpen(false)}
            project={activeProject}
          />
        </Suspense>
      )}
      <EditorPreferencesDialog
        isOpen={isEditorPreferencesOpen}
        onClose={() => setEditorPreferencesOpen(false)}
        preferences={editorPreferences}
        onUpdatePreferences={onUpdateEditorPreferences}
      />
      <KeyboardHelpDialog
        isOpen={isKeyboardHelpOpen}
        onClose={() => setKeyboardHelpOpen(false)}
      />
    </div>
  );
}

export default Toolbar;
