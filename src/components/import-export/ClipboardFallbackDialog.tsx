import { useEffect, useId, useRef } from "react";
import Dialog from "../common/Dialog";
import styles from "./ClipboardFallbackDialog.module.css";

export interface ClipboardFallbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
}

function ClipboardFallbackDialog({
  isOpen,
  onClose,
  html,
}: ClipboardFallbackDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.select();
    }
  }, [isOpen]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <h2 id={titleId} className={styles.title}>
        Copy manually
      </h2>
      <p id={descriptionId} className={styles.description}>
        Your browser didn't allow automatic clipboard access. Select the HTML
        below and copy it manually (Ctrl/Cmd+C).
      </p>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={html}
        readOnly
        rows={10}
        spellCheck={false}
        aria-label="Standalone HTML"
      />
      <div className={styles.actions}>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

export default ClipboardFallbackDialog;
