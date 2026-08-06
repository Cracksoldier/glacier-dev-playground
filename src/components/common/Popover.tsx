import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import styles from "./Popover.module.css";

export interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}

/**
 * A controlled popover anchored below `anchorRef`. Closes on outside click
 * or Escape and returns focus to the anchor on close.
 */
function Popover({
  isOpen,
  onClose,
  anchorRef,
  children,
  className,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={popoverRef}
      role="menu"
      className={className ? `${styles.popover} ${className}` : styles.popover}
    >
      {children}
    </div>
  );
}

export default Popover;
