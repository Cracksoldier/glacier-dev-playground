import type { Ref } from "react";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import { WarningIcon } from "../../components/common/icons";
import { mapRuntimeErrorLine } from "../../preview/mapErrorToSource";
import { computePreviewLineOffsets } from "../../preview/previewDocument";
import type { PreviewMessage } from "../../preview/previewMessage";
import { hasRelativeAssetUrls } from "../../preview/relativeUrlWarning";
import { useProjectStore } from "../../store/ProjectStoreContext";
import PreviewFrame, { type PreviewRunHandle } from "./PreviewFrame";
import styles from "./PreviewPanel.module.css";

interface PreviewPanelProps {
  consoleEntries: UseConsoleEntriesResult;
  ref?: Ref<PreviewRunHandle>;
}

function PreviewPanel({ consoleEntries, ref }: PreviewPanelProps) {
  const { activeProject } = useProjectStore();
  const showRelativeUrlWarning = hasRelativeAssetUrls(activeProject.source);
  const preserveConsole = activeProject.settings.preserveConsole;

  function handleBuildStart() {
    consoleEntries.startRun();
    if (!preserveConsole) consoleEntries.clear();
  }

  function handleMessage(message: PreviewMessage) {
    if (message.type === "ready") return;

    if (message.type === "console" && message.payload.level === "clear") {
      if (!preserveConsole) consoleEntries.clear();
      return;
    }

    switch (message.type) {
      case "console":
        consoleEntries.append({
          type: "console",
          level: message.payload.level,
          args: message.payload.args,
          timestampMs: message.payload.timestampMs,
        });
        return;
      case "runtime-error": {
        const mappedLocation =
          message.payload.line !== undefined
            ? mapRuntimeErrorLine(
                message.payload.line,
                computePreviewLineOffsets(activeProject.source),
              )
            : null;
        consoleEntries.append({
          type: "runtime-error",
          message: message.payload.message,
          stack: message.payload.stack,
          timestampMs: message.payload.timestampMs,
          mappedLocation,
        });
        return;
      }
      case "unhandled-rejection":
        consoleEntries.append({
          type: "unhandled-rejection",
          args: [message.payload.reason],
          timestampMs: message.payload.timestampMs,
        });
        return;
      case "resource-error":
        consoleEntries.append({
          type: "resource-error",
          message: message.payload.message,
          timestampMs: message.payload.timestampMs,
        });
        return;
      default: {
        const exhaustiveCheck: never = message;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <section className={styles.panel} aria-label="Preview">
      <div className={styles.header}>Preview</div>
      {showRelativeUrlWarning && (
        <div className={styles.warning} role="status">
          <WarningIcon />
          <p className={styles.warningMessage}>
            Relative asset URLs aren't portable. Use absolute HTTPS, CDN, or
            data URLs instead.
          </p>
        </div>
      )}
      <PreviewFrame
        key={activeProject.id}
        project={activeProject}
        onBuildStart={handleBuildStart}
        onMessage={handleMessage}
        ref={ref}
      />
    </section>
  );
}

export default PreviewPanel;
