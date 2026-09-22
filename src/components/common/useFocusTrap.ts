import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
} from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Auto-focuses the first focusable descendant of `containerRef` when
 * `isOpen` becomes true, restores focus to whatever was previously focused
 * when it closes, and returns a Tab keydown handler that wraps focus within
 * the container. Shared by `Dialog` and `Popover` so both trap focus
 * identically.
 */
function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  isOpen: boolean,
) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const containerElement = containerRef.current;
    const firstFocusable =
      containerElement?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, [isOpen, containerRef]);

  function handleTabTrap(event: ReactKeyboardEvent<T>) {
    if (event.key !== "Tab") return;

    const containerElement = containerRef.current;
    if (!containerElement) return;

    const focusable = Array.from(
      containerElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
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

  return { handleTabTrap };
}

export default useFocusTrap;
