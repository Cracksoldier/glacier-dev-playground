import type { Ref } from "react";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import { WarningIcon } from "../../components/common/icons";
import type { ProjectSource } from "../../models/project";
import { mapRuntimeErrorLine } from "../../preview/mapErrorToSource";
import { computePreviewLineOffsets } from "../../preview/previewDocument";
import type { PreviewMessage } from "../../preview/previewMessage";
import { hasRelativeAssetUrls } from "../../preview/relativeUrlWarning";
import type { ScssCompileError } from "../../preview/scssWorkerProtocol";
import { useProjectStore } from "../../store/ProjectStoreContext";
import PreviewFrame, { type PreviewRunHandle } from "./PreviewFrame";
import styles from "./PreviewPanel.module.css";

interface PreviewPanelProps {
  consoleEntries: UseConsoleEntriesResult;
  /** True when the last SCSS compile failed — the visible preview is stale relative to the current source. */
  isScssStale?: boolean;
  onScssCompileError?: (error: ScssCompileError, compilationId: string) => void;
  onScssCompileSuccess?: (css: string, compilationId: string) => void;
  ref?: Ref<PreviewRunHandle>;
}

function PreviewPanel({
  consoleEntries,
  isScssStale = false,
  onScssCompileError,
  onScssCompileSuccess,
  ref,
}: PreviewPanelProps) {
  const { activeProject } = useProjectStore();
  const showRelativeUrlWarning = hasRelativeAssetUrls(activeProject.source);
  const preserveConsole = activeProject.settings.preserveConsole;

  function handleBuildStart() {
    consoleEntries.startRun();
    if (!preserveConsole) consoleEntries.clear();
  }

  function handleScssCompileError(
    error: ScssCompileError,
    compilationId: string,
  ) {
    consoleEntries.append({
      type: "scss-compile-error",
      message: error.message,
      timestampMs: Date.now(),
      scssLocation:
        error.line !== undefined
          ? { line: error.line, column: error.column }
          : null,
    });
    onScssCompileError?.(error, compilationId);
  }

  function handleScssCompileSuccess(css: string, compilationId: string) {
    onScssCompileSuccess?.(css, compilationId);
  }

  function handleMessage(
    message: PreviewMessage,
    resolvedSource: ProjectSource,
  ) {
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
                computePreviewLineOffsets(resolvedSource),
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
      {isScssStale && (
        <div className={styles.warning} role="status">
          <WarningIcon />
          <p className={styles.warningMessage}>
            SCSS compile failed — showing the last successful preview.
          </p>
        </div>
      )}
      <PreviewFrame
        key={activeProject.id}
        project={activeProject}
        onBuildStart={handleBuildStart}
        onMessage={handleMessage}
        onScssCompileError={handleScssCompileError}
        onScssCompileSuccess={handleScssCompileSuccess}
        ref={ref}
      />
    </section>
  );
}

export default PreviewPanel;
