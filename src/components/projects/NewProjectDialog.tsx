import { type FormEvent, useId, useState } from "react";
import {
  DEFAULT_STARTER_TEMPLATE_ID,
  type TemplateId,
} from "../../models/templates";
import { useProjectStore } from "../../store/ProjectStoreContext";
import Dialog from "../common/Dialog";
import styles from "./NewProjectDialog.module.css";
import TemplatePicker from "./TemplatePicker";

export interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function NewProjectDialog({ isOpen, onClose }: NewProjectDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const titleInputId = useId();
  const { actions } = useProjectStore();
  const [templateId, setTemplateId] = useState<TemplateId>(
    DEFAULT_STARTER_TEMPLATE_ID,
  );
  const [title, setTitle] = useState("");

  function handleClose() {
    setTitle("");
    setTemplateId(DEFAULT_STARTER_TEMPLATE_ID);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    actions.createProject(templateId, title.trim() === "" ? undefined : title);
    handleClose();
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <h2 id={titleId} className={styles.title}>
        New project
      </h2>
      <p id={descriptionId} className={styles.description}>
        Choose a starting template and optionally name the new project.
      </p>
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor={titleInputId} className={styles.label}>
            Title
          </label>
          <input
            id={titleInputId}
            type="text"
            className={styles.input}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled Project"
          />
        </div>
        <TemplatePicker
          name="new-project-template"
          value={templateId}
          onChange={setTemplateId}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button type="submit" className={styles.createButton}>
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default NewProjectDialog;
