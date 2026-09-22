import { useId } from "react";
import type { ConsoleEntry } from "../../app/useConsoleEntries";
import type { MappedSourceLocation } from "../../preview/mapErrorToSource";
import { useProjectStore } from "../../store/ProjectStoreContext";
import { ClearIcon } from "../common/icons";
import styles from "./ConsolePanel.module.css";
import SerializedValueView from "./SerializedValueView";

export interface ConsoleBodyProps {
  entries: ConsoleEntry[];
  onClear: () => void;
  onFocusSource: (location: MappedSourceLocation) => void;
}

function formatRelativeTime(relativeMs: number): string {
  if (relativeMs < 1000) return `+${relativeMs}ms`;
  return `+${(relativeMs / 1000).toFixed(1)}s`;
}

type EntrySeverity = "error" | "warn" | "debug" | "log";

function entrySeverity(entry: ConsoleEntry): EntrySeverity {
  if (
    entry.type === "runtime-error" ||
    entry.type === "unhandled-rejection" ||
    entry.type === "scss-compile-error"
  ) {
    return "error";
  }
  switch (entry.level) {
    case "error":
      return "error";
    case "warn":
      return "warn";
    case "debug":
      return "debug";
    default:
      return "log";
  }
}

const SEVERITY_CLASS: Record<EntrySeverity, string> = {
  error: styles.severityError,
  warn: styles.severityWarn,
  debug: styles.severityDebug,
  log: styles.severityLog,
};

const SEVERITY_LABEL: Record<EntrySeverity, string> = {
  error: "ERROR",
  warn: "WARN",
  debug: "DEBUG",
  log: "LOG",
};

function entrySeverityClass(entry: ConsoleEntry): string {
  return SEVERITY_CLASS[entrySeverity(entry)];
}

function entrySeverityLabel(entry: ConsoleEntry): string {
  return SEVERITY_LABEL[entrySeverity(entry)];
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
    case "scss-compile-error":
      return entry.message ?? "SCSS compilation failed";
    case "script-diagnostic":
      return entry.message ?? "Script compilation issue";
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
  const focusLocation: MappedSourceLocation | null =
    entry.type === "runtime-error" && entry.mappedLocation
      ? entry.mappedLocation
      : entry.type === "scss-compile-error" && entry.scssLocation
        ? { panel: "style", line: entry.scssLocation.line }
        : entry.type === "script-diagnostic" && entry.scriptLocation
          ? { panel: "script", line: entry.scriptLocation.line }
          : null;

  const content = (
    <>
      <span className={`${styles.severityTag} ${entrySeverityClass(entry)}`}>
        {entrySeverityLabel(entry)}
      </span>
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

  if (focusLocation) {
    return (
      <li className={`${styles.entry} ${entrySeverityClass(entry)}`}>
        <button
          type="button"
          className={styles.entryButton}
          onClick={() => onFocusSource(focusLocation)}
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

/**
 * The toolbar + entries list, extracted from `ConsolePanel` so the narrow
 * per-tab console view (Batch C) can render it directly, without the
 * desktop accordion's toggle/collapse chrome.
 */
function ConsoleBody({ entries, onClear, onFocusSource }: ConsoleBodyProps) {
  const { activeProject, actions } = useProjectStore();
  const preserveLogsId = useId();

  return (
    <>
      <div className={styles.toolbar}>
        <button type="button" className={styles.clearButton} onClick={onClear}>
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
    </>
  );
}

export default ConsoleBody;
