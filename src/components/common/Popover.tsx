import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import styles from "./Popover.module.css";
import useFocusTrap from "./useFocusTrap";

export interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  "aria-label": string;
  children: ReactNode;
  className?: string;
}

/**
 * A controlled popover anchored below `anchorRef`. Traps focus, closes on
 * outside click or Escape, and returns focus to the anchor on close.
 *
 * Follows the disclosure pattern: the content is a labelled `group` of
 * ordinary controls, and the trigger exposes only `aria-expanded`. It is
 * deliberately not `role="menu"`, which would promise `menuitem` children
 * and arrow-key navigation these popovers don't have.
 */
function Popover({
  isOpen,
  onClose,
  anchorRef,
  "aria-label": ariaLabel,
  children,
  className,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { handleTabTrap } = useFocusTrap(popoverRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onClose();
      anchorRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> groups form controls under a legend; this is a generic disclosure panel (e.g. a list of project actions), so a labelled role="group" div is the accurate semantics.
    <div
      ref={popoverRef}
      role="group"
      aria-label={ariaLabel}
      className={className ? `${styles.popover} ${className}` : styles.popover}
      onKeyDown={handleTabTrap}
    >
      {children}
    </div>
  );
}

export default Popover;
