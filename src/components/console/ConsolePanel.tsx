import { useId } from "react";
import type { ConsoleEntry } from "../../app/useConsoleEntries";
import { useConsoleVisibility } from "../../app/useConsoleVisibility";
import type { MappedSourceLocation } from "../../preview/mapErrorToSource";
import { ChevronIcon } from "../common/icons";
import ConsoleBody from "./ConsoleBody";
import styles from "./ConsolePanel.module.css";

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
  onFocusSource: (location: MappedSourceLocation) => void;
}

function ConsolePanel({ entries, onClear, onFocusSource }: ConsolePanelProps) {
  const { isConsoleVisible, toggleConsoleVisible } = useConsoleVisibility();
  const contentId = useId();
  const headingId = useId();

  const errorCount = entries.filter(
    (entry) =>
      entry.type === "runtime-error" ||
      entry.type === "scss-compile-error" ||
      (entry.type === "script-diagnostic" && entry.level === "error"),
  ).length;

  return (
    <section className={styles.console} aria-labelledby={headingId}>
      <h2 id={headingId} className="glacier-visually-hidden">
        Console
      </h2>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isConsoleVisible}
        aria-controls={contentId}
        onClick={toggleConsoleVisible}
      >
        <ChevronIcon
          className={
            isConsoleVisible
              ? `${styles.chevron} ${styles.chevronOpen}`
              : styles.chevron
          }
        />
        Console
        {errorCount > 0 && <span className={styles.badge}>{errorCount}</span>}
      </button>
      <span aria-live="polite" className="glacier-visually-hidden">
        {errorCount > 0
          ? `${errorCount} error${errorCount === 1 ? "" : "s"}`
          : ""}
      </span>
      {isConsoleVisible && (
        <div id={contentId} className={styles.body}>
          <ConsoleBody
            entries={entries}
            onClear={onClear}
            onFocusSource={onFocusSource}
          />
        </div>
      )}
    </section>
  );
}

export default ConsolePanel;
