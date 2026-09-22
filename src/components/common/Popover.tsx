import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import styles from "./Popover.module.css";
import useFocusTrap from "./useFocusTrap";

export interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  role?: "menu" | "group";
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A controlled popover anchored below `anchorRef`. Traps focus, closes on
 * outside click or Escape, and returns focus to the anchor on close.
 */
function Popover({
  isOpen,
  onClose,
  anchorRef,
  role,
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
    // biome-ignore lint/a11y/noStaticElementInteractions: role is always a caller-supplied interactive ARIA role ("menu" or "group"); biome can't see through the prop variable statically.
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label is valid for both "menu" and "group", the only roles this component accepts.
    <div
      ref={popoverRef}
      role={role}
      aria-label={ariaLabel}
      className={className ? `${styles.popover} ${className}` : styles.popover}
      onKeyDown={handleTabTrap}
    >
      {children}
    </div>
  );
}

export default Popover;
