import type { SerializedValue } from "../../preview/previewMessage";
import styles from "./SerializedValueView.module.css";

interface SerializedValueViewProps {
  value: SerializedValue;
}

function formatPrimitive(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

/**
 * Renders a `SerializedValue` tree (produced by the sandboxed preview's
 * bridge script — see `previewBridge.ts`) as an expandable console-style
 * inspector, using native `<details>/<summary>` rather than a hand-rolled
 * tree widget, matching this codebase's convention of avoiding extra
 * dependencies for simple expand/collapse UI (see `Dialog`/`Popover`).
 */
function SerializedValueView({ value }: SerializedValueViewProps) {
  switch (value.kind) {
    case "primitive":
      return (
        <span className={styles.primitive}>{formatPrimitive(value.value)}</span>
      );

    case "array":
      if (value.items.length === 0) {
        return <span className={styles.container}>[]</span>;
      }
      return (
        <details className={styles.details}>
          <summary className={styles.summary}>
            Array({value.items.length}
            {value.truncated ? "+" : ""})
          </summary>
          <ul className={styles.entries}>
            {value.items.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: this is a snapshot of a serialized console value, not a reorderable/mutable list.
              <li key={index} className={styles.entry}>
                <span className={styles.key}>{index}:</span>{" "}
                <SerializedValueView value={item} />
              </li>
            ))}
            {value.truncated && (
              <li className={styles.truncated}>… truncated</li>
            )}
          </ul>
        </details>
      );

    case "object":
      if (value.entries.length === 0) {
        return <span className={styles.container}>{"{}"}</span>;
      }
      return (
        <details className={styles.details}>
          <summary className={styles.summary}>
            Object({value.entries.length}
            {value.truncated ? "+" : ""})
          </summary>
          <ul className={styles.entries}>
            {value.entries.map(([key, entryValue]) => (
              <li key={key} className={styles.entry}>
                <span className={styles.key}>{key}:</span>{" "}
                <SerializedValueView value={entryValue} />
              </li>
            ))}
            {value.truncated && (
              <li className={styles.truncated}>… truncated</li>
            )}
          </ul>
        </details>
      );

    case "error":
      return (
        <span className={styles.error}>
          {value.name}: {value.message}
          {value.stack && (
            <details className={styles.details}>
              <summary className={styles.summary}>stack</summary>
              <pre className={styles.stack}>{value.stack}</pre>
            </details>
          )}
        </span>
      );

    case "node":
      return (
        <span className={styles.node}>
          {"<"}
          {value.tagName}
          {value.id && ` id="${value.id}"`}
          {value.className && ` class="${value.className}"`}
          {">"}
        </span>
      );

    case "function":
      return (
        <span className={styles.function}>
          ƒ {value.name || "(anonymous)"}()
        </span>
      );

    case "circular":
      return <span className={styles.circular}>[Circular]</span>;

    case "unsupported":
      return <span className={styles.unsupported}>[{value.tag}]</span>;

    default: {
      const exhaustiveCheck: never = value;
      return exhaustiveCheck;
    }
  }
}

export default SerializedValueView;
