import { useId, useState } from "react";
import {
  type CompileForExportResult,
  compileProjectSourceForExport,
} from "../../import-export/compileForExport";
import { triggerBlobDownload } from "../../import-export/downloadBlob";
import { buildExportFileName } from "../../import-export/exportFileName";
import { serializeProjectForExport } from "../../import-export/projectExportJson";
import { buildStandaloneHtmlDocument } from "../../import-export/standaloneHtmlDocument";
import { downloadProjectZip } from "../../import-export/zipExport";
import type { PlaygroundProject } from "../../models/project";
import Dialog from "../common/Dialog";
import SecretsWarning from "../common/SecretsWarning";
import ClipboardFallbackDialog from "./ClipboardFallbackDialog";
import styles from "./ExportDialog.module.css";

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: PlaygroundProject;
}

type ActionStatus = "idle" | "busy" | "error";
type ClipboardActionStatus = ActionStatus | "copied";

function describeCompileError(
  result: Exclude<CompileForExportResult, { status: "ok" }>,
): string {
  if (result.status === "scss-error") {
    return `SCSS compile failed: ${result.message}`;
  }
  const count = result.diagnostics.length;
  return `TypeScript compile failed (${count} error${count === 1 ? "" : "s"}).`;
}

function ExportDialog({ isOpen, onClose, project }: ExportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [htmlStatus, setHtmlStatus] = useState<ActionStatus>("idle");
  const [htmlError, setHtmlError] = useState<string | null>(null);
  const [clipboardStatus, setClipboardStatus] =
    useState<ClipboardActionStatus>("idle");
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [zipStatus, setZipStatus] = useState<ActionStatus>("idle");
  const [zipError, setZipError] = useState<string | null>(null);
  const [fallbackHtml, setFallbackHtml] = useState<string | null>(null);

  function resetState() {
    setJsonError(null);
    setHtmlStatus("idle");
    setHtmlError(null);
    setClipboardStatus("idle");
    setClipboardError(null);
    setZipStatus("idle");
    setZipError(null);
    setFallbackHtml(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleDownloadJson() {
    try {
      const json = serializeProjectForExport(project);
      const blob = new Blob([json], { type: "application/json" });
      triggerBlobDownload(blob, buildExportFileName(project.title, "json"));
      setJsonError(null);
    } catch {
      setJsonError("Couldn't build the export file.");
    }
  }

  async function handleDownloadHtml() {
    setHtmlStatus("busy");
    setHtmlError(null);
    const result = await compileProjectSourceForExport(project.source);
    if (result.status !== "ok") {
      setHtmlStatus("error");
      setHtmlError(describeCompileError(result));
      return;
    }
    const html = buildStandaloneHtmlDocument(
      result.resolvedSource,
      project.resources,
    );
    const blob = new Blob([html], { type: "text/html" });
    triggerBlobDownload(blob, buildExportFileName(project.title, "html"));
    setHtmlStatus("idle");
  }

  async function handleCopyClipboard() {
    setClipboardStatus("busy");
    setClipboardError(null);
    const result = await compileProjectSourceForExport(project.source);
    if (result.status !== "ok") {
      setClipboardStatus("error");
      setClipboardError(describeCompileError(result));
      return;
    }
    const html = buildStandaloneHtmlDocument(
      result.resolvedSource,
      project.resources,
    );

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(html);
        setClipboardStatus("copied");
        return;
      } catch {
        setClipboardStatus("idle");
        setFallbackHtml(html);
        return;
      }
    }
    setClipboardStatus("idle");
    setFallbackHtml(html);
  }

  async function handleDownloadZip() {
    setZipStatus("busy");
    setZipError(null);
    const status = await downloadProjectZip(project);
    if (status !== "ok") {
      setZipStatus("error");
      setZipError(
        status === "scss-error"
          ? "SCSS compile failed."
          : "TypeScript compile failed.",
      );
      return;
    }
    setZipStatus("idle");
  }

  return (
    <>
      <Dialog
        isOpen={isOpen && !fallbackHtml}
        onClose={handleClose}
        titleId={titleId}
        descriptionId={descriptionId}
      >
        <h2 id={titleId} className={styles.title}>
          Export project
        </h2>
        <p id={descriptionId} className={styles.description}>
          Export the current project as JSON, a standalone HTML file, or a ZIP
          archive.
        </p>

        <SecretsWarning>
          Anything you export is readable by everyone you share it with. Don't
          put API keys, tokens, or passwords in frontend code.
        </SecretsWarning>

        <div className={styles.actionRow}>
          <div className={styles.actionInfo}>
            <p className={styles.actionLabel}>Project JSON</p>
            <p className={styles.actionHint}>
              Portable source file — re-import it later or share it.
            </p>
            {jsonError && (
              <p className={styles.errorText} role="alert">
                {jsonError}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleDownloadJson}
          >
            Download JSON
          </button>
        </div>

        <div className={styles.actionRow}>
          <div className={styles.actionInfo}>
            <p className={styles.actionLabel}>Standalone HTML</p>
            <p className={styles.actionHint}>
              A single file that runs in any browser, no build step.
            </p>
            {htmlStatus === "busy" && (
              <p className={styles.statusText} role="status">
                Compiling…
              </p>
            )}
            {htmlError && (
              <p className={styles.errorText} role="alert">
                {htmlError}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleDownloadHtml}
            disabled={htmlStatus === "busy"}
          >
            Download HTML
          </button>
        </div>

        <div className={styles.actionRow}>
          <div className={styles.actionInfo}>
            <p className={styles.actionLabel}>Copy to clipboard</p>
            <p className={styles.actionHint}>
              Copies the same standalone HTML document.
            </p>
            {clipboardStatus === "busy" && (
              <p className={styles.statusText} role="status">
                Compiling…
              </p>
            )}
            {clipboardStatus === "copied" && (
              <p className={styles.statusText} role="status">
                Copied
              </p>
            )}
            {clipboardError && (
              <p className={styles.errorText} role="alert">
                {clipboardError}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleCopyClipboard}
            disabled={clipboardStatus === "busy"}
          >
            Copy HTML
          </button>
        </div>

        <div className={styles.actionRow}>
          <div className={styles.actionInfo}>
            <p className={styles.actionLabel}>ZIP archive</p>
            <p className={styles.actionHint}>
              Runnable root files, plus the original SCSS/TypeScript source when
              used.
            </p>
            {zipStatus === "busy" && (
              <p className={styles.statusText} role="status">
                Compiling…
              </p>
            )}
            {zipError && (
              <p className={styles.errorText} role="alert">
                {zipError}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleDownloadZip}
            disabled={zipStatus === "busy"}
          >
            Download ZIP
          </button>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </Dialog>
      <ClipboardFallbackDialog
        isOpen={isOpen && Boolean(fallbackHtml)}
        onClose={() => setFallbackHtml(null)}
        html={fallbackHtml ?? ""}
      />
    </>
  );
}

export default ExportDialog;
