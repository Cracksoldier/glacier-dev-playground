import { type ChangeEvent, useId, useState } from "react";
import {
  IMPORT_MAX_SIZE_BYTES,
  type ImportedProjectDraft,
  type ImportValidationResult,
  parseImportedProjectJson,
} from "../../import-export/importValidation";
import { useProjectStore } from "../../store/ProjectStoreContext";
import ConfirmDialog from "../common/ConfirmDialog";
import Dialog from "../common/Dialog";
import styles from "./ImportDialog.module.css";

export interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "input" | "confirm";
type ImportMode = "add" | "replace";

const MAX_SIZE_MB = IMPORT_MAX_SIZE_BYTES / (1024 * 1024);

function describeError(
  result: Exclude<ImportValidationResult, { status: "ok" }>,
): string {
  switch (result.status) {
    case "too-large":
      return `The file exceeds the ${MAX_SIZE_MB} MB import size limit.`;
    case "malformed-json":
      return "The file is not valid JSON.";
    case "unsupported-future-version":
      return `This file was created with a newer version of Glacier DEV Playground (schema v${result.version}) and can't be imported here.`;
    case "invalid":
      return result.reason;
  }
}

function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const textareaId = useId();
  const fileInputId = useId();
  const { activeProject, actions } = useProjectStore();

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ImportedProjectDraft | null>(null);
  const [mode, setMode] = useState<ImportMode>("add");

  function resetState() {
    setStep("input");
    setText("");
    setError(null);
    setDraft(null);
    setMode("add");
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function validateText(candidate: string) {
    const result = parseImportedProjectJson(candidate);
    if (result.status === "ok") {
      setError(null);
      setDraft(result.draft);
      return;
    }
    setDraft(null);
    setError(describeError(result));
  }

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    setError(null);
    setDraft(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setText(content);
      validateText(content);
    };
    reader.readAsText(file);
  }

  function handleImportClick() {
    if (!draft) return;
    if (mode === "add") {
      actions.importProject({ mode: "add", draft });
      handleClose();
      return;
    }
    setStep("confirm");
  }

  function handleConfirmReplace() {
    if (!draft) return;
    actions.importProject({
      mode: "replace",
      targetProjectId: activeProject.id,
      draft,
    });
    handleClose();
  }

  if (step === "confirm" && draft) {
    return (
      <ConfirmDialog
        isOpen={isOpen}
        title="Replace project"
        description={`This replaces "${activeProject.title}"'s HTML, CSS, JavaScript, resources, and settings with the imported project. This cannot be undone.`}
        confirmLabel="Replace"
        destructive
        onConfirm={handleConfirmReplace}
        onCancel={() => setStep("input")}
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
        Import project
      </h2>
      <p id={descriptionId} className={styles.description}>
        Import a project from a JSON file or pasted JSON text.
      </p>

      <div className={styles.field}>
        <label htmlFor={fileInputId} className={styles.label}>
          Import from a file
        </label>
        <input
          id={fileInputId}
          type="file"
          accept="application/json"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={textareaId} className={styles.label}>
          Or paste project JSON
        </label>
        <textarea
          id={textareaId}
          className={styles.textarea}
          value={text}
          onChange={handleTextChange}
          rows={8}
          spellCheck={false}
        />
        {error && (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        )}
      </div>

      {draft && (
        <div className={styles.preview}>
          <p className={styles.previewSummary}>
            "{draft.title}" — {draft.resources.length} resource
            {draft.resources.length === 1 ? "" : "s"}
          </p>
          <fieldset className={styles.modeFieldset}>
            <legend className={styles.modeLegend}>Import as</legend>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="import-mode"
                value="add"
                checked={mode === "add"}
                onChange={() => setMode("add")}
              />
              Add as a new project
            </label>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              Replace the current project ("{activeProject.title}")
            </label>
          </fieldset>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={handleClose}
        >
          Cancel
        </button>
        {draft ? (
          <button
            type="button"
            className={styles.continueButton}
            onClick={handleImportClick}
          >
            Import
          </button>
        ) : (
          <button
            type="button"
            className={styles.continueButton}
            onClick={() => validateText(text)}
          >
            Continue
          </button>
        )}
      </div>
    </Dialog>
  );
}

export default ImportDialog;
