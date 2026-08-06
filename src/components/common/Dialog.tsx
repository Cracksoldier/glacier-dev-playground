import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import styles from "./Dialog.module.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
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
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const dialogElement = dialogRef.current;
    const firstFocusable =
      dialogElement?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const dialogRoot = document.getElementById("dialog-root");
  if (!dialogRoot) return null;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const focusable = Array.from(
      dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
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
