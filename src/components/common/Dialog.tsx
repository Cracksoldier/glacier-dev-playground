import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Dialog.module.css";
import useFocusTrap from "./useFocusTrap";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Portals into `#dialog-root`. Traps focus, closes on Escape or a backdrop
 * click, and restores focus to whatever was focused before the dialog
 * opened.
 */
function Dialog({
  isOpen,
  onClose,
  titleId,
  descriptionId,
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { handleTabTrap } = useFocusTrap(dialogRef, isOpen);

  if (!isOpen) return null;

  const dialogRoot = document.getElementById("dialog-root");
  if (!dialogRoot) return null;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    handleTabTrap(event);
  }

  return createPortal(
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.backdropButton}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={className ? `${styles.dialog} ${className}` : styles.dialog}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>,
    dialogRoot,
  );
}

export default Dialog;
