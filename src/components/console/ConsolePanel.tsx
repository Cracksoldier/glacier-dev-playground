import { useId } from "react";
import type { ConsoleEntry } from "../../app/useConsoleEntries";
import { useConsoleVisibility } from "../../app/useConsoleVisibility";
import type { MappedSourceLocation } from "../../preview/mapErrorToSource";
import { useProjectStore } from "../../store/ProjectStoreContext";
import { ChevronIcon, ClearIcon } from "../common/icons";
import styles from "./ConsolePanel.module.css";
import SerializedValueView from "./SerializedValueView";

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
  onFocusSource: (location: MappedSourceLocation) => void;
}

function formatRelativeTime(relativeMs: number): string {
  if (relativeMs < 1000) return `+${relativeMs}ms`;
  return `+${(relativeMs / 1000).toFixed(1)}s`;
}

function entrySeverityClass(entry: ConsoleEntry): string {
  if (entry.type === "runtime-error" || entry.type === "unhandled-rejection") {
    return styles.severityError;
  }
  switch (entry.level) {
    case "error":
      return styles.severityError;
    case "warn":
      return styles.severityWarn;
    case "debug":
      return styles.severityDebug;
    default:
      return styles.severityLog;
  }
}

function entryMessage(entry: ConsoleEntry): string {
  switch (entry.type) {
    case "runtime-error":
      return entry.message ?? "Runtime error";
    case "unhandled-rejection":
      return "Unhandled promise rejection:";
    case "ready":
      return "Preview ready";
    case "resource-error":
      return entry.message ?? "Resource error";
    default:
      return "";
  }
}

function ConsoleEntryRow({
  entry,
  onFocusSource,
}: {
  entry: ConsoleEntry;
  onFocusSource: (location: MappedSourceLocation) => void;
}) {
  const isClickable =
    entry.type === "runtime-error" && entry.mappedLocation != null;

  const content = (
    <>
      <span className={styles.entryTime}>
        {formatRelativeTime(entry.relativeMs)}
      </span>
      <span className={styles.entryBody}>
        {entry.type === "unhandled-rejection" && (
          <span className={styles.entryLabel}>{entryMessage(entry)} </span>
        )}
        {entry.args ? (
          entry.args.map((arg, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: args is a fixed-length snapshot for this entry, not a reorderable list.
            <span key={index} className={styles.arg}>
              <SerializedValueView value={arg} />
            </span>
          ))
        ) : (
          <span>{entryMessage(entry)}</span>
        )}
        {entry.stack && <pre className={styles.stack}>{entry.stack}</pre>}
      </span>
    </>
  );

  if (isClickable && entry.mappedLocation) {
    const location = entry.mappedLocation;
    return (
      <li className={`${styles.entry} ${entrySeverityClass(entry)}`}>
        <button
          type="button"
          className={styles.entryButton}
          onClick={() => onFocusSource(location)}
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className={`${styles.entry} ${entrySeverityClass(entry)}`}>
      {content}
    </li>
  );
}

function ConsolePanel({ entries, onClear, onFocusSource }: ConsolePanelProps) {
  const { isConsoleVisible, toggleConsoleVisible } = useConsoleVisibility();
  const { activeProject, actions } = useProjectStore();
  const contentId = useId();
  const preserveLogsId = useId();

  const errorCount = entries.filter(
    (entry) => entry.type === "runtime-error",
  ).length;

  return (
    <section className={styles.console} aria-label="Console">
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
      {isConsoleVisible && (
        <div id={contentId} className={styles.body}>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.clearButton}
              onClick={onClear}
            >
              <ClearIcon size={14} />
              Clear
            </button>
            <label className={styles.preserveLogs} htmlFor={preserveLogsId}>
              <input
                id={preserveLogsId}
                type="checkbox"
                checked={activeProject.settings.preserveConsole}
                onChange={(event) =>
                  actions.updateProjectSettings(activeProject.id, {
                    preserveConsole: event.target.checked,
                  })
                }
              />
              Preserve logs
            </label>
          </div>
          {entries.length === 0 ? (
            <p className={styles.empty}>No console output yet.</p>
          ) : (
            <ul className={styles.entries}>
              {entries.map((entry) => (
                <ConsoleEntryRow
                  key={entry.id}
                  entry={entry}
                  onFocusSource={onFocusSource}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default ConsolePanel;
