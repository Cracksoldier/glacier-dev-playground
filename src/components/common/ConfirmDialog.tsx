import { useId } from "react";
import styles from "./ConfirmDialog.module.css";
import Dialog from "./Dialog";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p id={descriptionId} className={styles.description}>
        {description}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={
            destructive
              ? `${styles.confirmButton} ${styles.destructive}`
              : styles.confirmButton
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;
