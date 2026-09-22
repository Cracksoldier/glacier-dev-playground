import { useId, useState } from "react";
import type { ProjectId } from "../../models/project";
import {
  DEFAULT_STARTER_TEMPLATE_ID,
  PROJECT_TEMPLATES,
  type TemplateId,
} from "../../models/templates";
import { useProjectStore } from "../../store/ProjectStoreContext";
import ConfirmDialog from "../common/ConfirmDialog";
import Dialog from "../common/Dialog";
import styles from "./ResetProjectDialog.module.css";
import TemplatePicker from "./TemplatePicker";

export interface ResetProjectDialogProps {
  isOpen: boolean;
  projectId: ProjectId;
  onClose: () => void;
}

type Step = "template" | "confirm";

function ResetProjectDialog({
  isOpen,
  projectId,
  onClose,
}: ResetProjectDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const { actions } = useProjectStore();
  const [step, setStep] = useState<Step>("template");
  const [templateId, setTemplateId] = useState<TemplateId>(
    DEFAULT_STARTER_TEMPLATE_ID,
  );

  function handleClose() {
    setStep("template");
    setTemplateId(DEFAULT_STARTER_TEMPLATE_ID);
    onClose();
  }

  function handleConfirm() {
    actions.resetProjectFromTemplate(projectId, templateId);
    handleClose();
  }

  if (step === "confirm") {
    return (
      <ConfirmDialog
        isOpen={isOpen}
        title="Reset project"
        description={`This replaces the project's HTML, CSS, and JavaScript with the "${PROJECT_TEMPLATES[templateId].label}" template. This cannot be undone.`}
        confirmLabel="Reset"
        destructive
        onConfirm={handleConfirm}
        onCancel={handleClose}
      />
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <h2 id={titleId} className={styles.title}>
        Reset project
      </h2>
      <p id={descriptionId} className={styles.description}>
        Choose a template to reset the project's HTML, CSS, and JavaScript to.
        This cannot be undone.
      </p>
      <TemplatePicker
        name="reset-project-template"
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
        <button
          type="button"
          className={styles.continueButton}
          onClick={() => setStep("confirm")}
        >
          Continue
        </button>
      </div>
    </Dialog>
  );
}

export default ResetProjectDialog;
