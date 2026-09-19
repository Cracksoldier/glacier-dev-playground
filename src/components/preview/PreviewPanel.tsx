import type { Ref } from "react";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import { WarningIcon } from "../../components/common/icons";
import { mapRuntimeErrorLine } from "../../preview/mapErrorToSource";
import { computePreviewLineOffsets } from "../../preview/previewDocument";
import type { PreviewMessage } from "../../preview/previewMessage";
import { hasRelativeAssetUrls } from "../../preview/relativeUrlWarning";
import type { ScssCompileError } from "../../preview/scssWorkerProtocol";
import type { TsDiagnostic } from "../../preview/tsWorkerProtocol";
import { useProjectStore } from "../../store/ProjectStoreContext";
import PreviewFrame, {
  type PreviewRunHandle,
  type ResolvedPreviewBuild,
} from "./PreviewFrame";
import styles from "./PreviewPanel.module.css";

interface PreviewPanelProps {
  consoleEntries: UseConsoleEntriesResult;
  /** True when the last SCSS compile failed — the visible preview is stale relative to the current source. */
  isScssStale?: boolean;
  /** True when the last TS/JS compile produced a blocking diagnostic — the visible preview is stale relative to the current source. */
  isScriptStale?: boolean;
  onScssCompileError?: (error: ScssCompileError, compilationId: string) => void;
  onScssCompileSuccess?: (css: string, compilationId: string) => void;
  onScriptDiagnostics?: (
    diagnostics: TsDiagnostic[],
    compilationId: string,
  ) => void;
  ref?: Ref<PreviewRunHandle>;
}

function PreviewPanel({
  consoleEntries,
  isScssStale = false,
  isScriptStale = false,
  onScssCompileError,
  onScssCompileSuccess,
  onScriptDiagnostics,
  ref,
}: PreviewPanelProps) {
  const { activeProject } = useProjectStore();
  const showRelativeUrlWarning = hasRelativeAssetUrls(activeProject.source);
  const preserveConsole = activeProject.settings.preserveConsole;
  const scriptLanguageLabel =
    activeProject.source.scriptLanguage === "typescript"
      ? "TypeScript"
      : "JavaScript";

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

  function handleScriptDiagnostics(
    diagnostics: TsDiagnostic[],
    compilationId: string,
  ) {
    const timestampMs = Date.now();
    for (const diagnostic of diagnostics) {
      consoleEntries.append({
        type: "script-diagnostic",
        level: diagnostic.category === "error" ? "error" : "warn",
        message: diagnostic.message,
        timestampMs,
        scriptLocation:
          diagnostic.line !== undefined
            ? { line: diagnostic.line, column: diagnostic.column }
            : null,
      });
    }
    onScriptDiagnostics?.(diagnostics, compilationId);
  }

  function handleMessage(
    message: PreviewMessage,
    resolvedBuild: ResolvedPreviewBuild,
  ) {
    const { resolvedSource, scriptLineMap } = resolvedBuild;
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
                scriptLineMap,
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
      {isScriptStale && (
        <div className={styles.warning} role="status">
          <WarningIcon />
          <p className={styles.warningMessage}>
            {scriptLanguageLabel} compile failed — showing the last successful
            preview.
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
        onScriptDiagnostics={handleScriptDiagnostics}
        ref={ref}
      />
    </section>
  );
}

export default PreviewPanel;
