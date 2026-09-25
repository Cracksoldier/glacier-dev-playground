import { type Ref, useEffect, useId, useImperativeHandle, useRef } from "react";
import type { UseConsoleEntriesResult } from "../../app/useConsoleEntries";
import { FullWindowIcon, WarningIcon } from "../../components/common/icons";
import { requiresTrustApproval } from "../../models/trustGate";
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

/**
 * Whether the preview covers the whole viewport (`full-window`). Never a
 * separate browser window. Showing only the preview inside the workspace is
 * the toolbar's "Preview only" layout instead.
 */
export type PreviewPresentation = "default" | "full-window";

interface PreviewPanelProps {
  consoleEntries: UseConsoleEntriesResult;
  presentation: PreviewPresentation;
  onPresentationChange: (presentation: PreviewPresentation) => void;
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
  presentation,
  onPresentationChange,
  isScssStale = false,
  isScriptStale = false,
  onScssCompileError,
  onScssCompileSuccess,
  onScriptDiagnostics,
  ref,
}: PreviewPanelProps) {
  const { activeProject, actions } = useProjectStore();
  const headingId = useId();
  const showRelativeUrlWarning = hasRelativeAssetUrls(activeProject.source);
  const preserveConsole = activeProject.settings.preserveConsole;
  const scriptLanguageLabel =
    activeProject.source.scriptLanguage === "typescript"
      ? "TypeScript"
      : "JavaScript";
  const needsTrustApproval = requiresTrustApproval(activeProject);

  const frameRef = useRef<PreviewRunHandle>(null);
  useImperativeHandle(
    ref,
    () => ({
      runNow: () => frameRef.current?.runNow(),
      runTrusted: () => frameRef.current?.runTrusted(),
      focus: () => frameRef.current?.focus(),
    }),
    [],
  );

  useEffect(() => {
    if (presentation !== "full-window") return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onPresentationChange("default");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [presentation, onPresentationChange]);

  function handleTrustAndRun() {
    actions.setProjectTrusted(activeProject.id, true);
    frameRef.current?.runTrusted();
  }

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

  function handleResourceLoadError(payload: {
    url: string;
    message: string;
    timestampMs: number;
  }) {
    consoleEntries.append({
      type: "resource-error",
      message: payload.message,
      timestampMs: payload.timestampMs,
    });
  }

  function handleMessage(
    message: PreviewMessage,
    resolvedBuild: ResolvedPreviewBuild,
  ) {
    const { resolvedSource, scriptLineMap, resources } = resolvedBuild;
    if (message.type === "ready" || message.type === "resources-ready") return;

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
                computePreviewLineOffsets(resolvedSource, resources),
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
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.label}>
          Preview
        </h2>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            aria-label="Full-window preview"
            aria-pressed={presentation === "full-window"}
            onClick={() =>
              onPresentationChange(
                presentation === "full-window" ? "default" : "full-window",
              )
            }
          >
            <FullWindowIcon />
          </button>
        </div>
      </div>
      {needsTrustApproval && (
        <div className={styles.warning} role="status">
          <WarningIcon />
          <p className={styles.warningMessage}>
            This imported project includes script or module resources and hasn't
            been trusted yet — it won't run automatically.
          </p>
          <button
            type="button"
            className={styles.trustButton}
            onClick={handleTrustAndRun}
          >
            Trust and run
          </button>
        </div>
      )}
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
        onResourceLoadError={handleResourceLoadError}
        ref={frameRef}
      />
    </section>
  );
}

export default PreviewPanel;
