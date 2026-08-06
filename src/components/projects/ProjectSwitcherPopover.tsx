import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { PlaygroundProject, ProjectId } from "../../models/project";
import { useProjectStore } from "../../store/ProjectStoreContext";
import ConfirmDialog from "../common/ConfirmDialog";
import Popover from "../common/Popover";
import styles from "./ProjectSwitcherPopover.module.css";

export interface ProjectSwitcherPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
}

interface RenameRowProps {
  project: PlaygroundProject;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function RenameRow({
  project,
  value,
  onChange,
  onCommit,
  onCancel,
}: RenameRowProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <form
      className={styles.renameForm}
      onSubmit={(event) => {
        event.preventDefault();
        onCommit();
      }}
    >
      <label htmlFor={inputId} className={styles.srOnly}>
        New title for {project.title}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        className={styles.renameInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      />
    </form>
  );
}

function ProjectSwitcherPopover({
  isOpen,
  onClose,
  anchorRef,
}: ProjectSwitcherPopoverProps) {
  const { projects, activeProject, actions } = useProjectStore();
  const [renamingId, setRenamingId] = useState<ProjectId | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<ProjectId | null>(
    null,
  );

  function startRename(project: PlaygroundProject) {
    setRenamingId(project.id);
    setRenameValue(project.title);
  }

  function commitRename() {
    if (renamingId !== null) {
      actions.renameProject(renamingId, renameValue);
    }
    setRenamingId(null);
  }

  function cancelRename() {
    setRenamingId(null);
  }

  const pendingDeleteProject =
    projects.find((project) => project.id === pendingDeleteId) ?? null;

  return (
    <>
      <Popover
        isOpen={isOpen}
        onClose={onClose}
        anchorRef={anchorRef}
        className={styles.popover}
      >
        <ul className={styles.list}>
          {projects.map((project) => {
            const isActive = project.id === activeProject.id;
            const isRenaming = project.id === renamingId;

            return (
              <li key={project.id} className={styles.row}>
                {isRenaming ? (
                  <RenameRow
                    project={project}
                    value={renameValue}
                    onChange={setRenameValue}
                    onCommit={commitRename}
                    onCancel={cancelRename}
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.switchButton}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => {
                      actions.switchProject(project.id);
                      onClose();
                    }}
                  >
                    {project.title}
                  </button>
                )}
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.rowActionButton}
                    aria-label={`Rename ${project.title}`}
                    title="Rename"
                    onClick={() => startRename(project)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={styles.rowActionButton}
                    aria-label={`Duplicate ${project.title}`}
                    title="Duplicate"
                    onClick={() => actions.duplicateProject(project.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className={styles.rowActionButton}
                    aria-label={`Delete ${project.title}`}
                    title="Delete"
                    onClick={() => setPendingDeleteId(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Popover>
      {pendingDeleteProject && (
        <ConfirmDialog
          isOpen={true}
          title="Delete project"
          description={`Delete "${pendingDeleteProject.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            actions.deleteProject(pendingDeleteProject.id);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
}

export default ProjectSwitcherPopover;
