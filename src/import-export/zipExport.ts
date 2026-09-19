import type { PlaygroundProject } from "../models/project";
import {
  type CompileForExportResult,
  compileProjectSourceForExport,
} from "./compileForExport";
import { triggerBlobDownload } from "./downloadBlob";
import { buildExportFileName } from "./exportFileName";
import { buildZipFileEntries } from "./zipFileEntries";

/**
 * Compiles the project, builds the ZIP's file entries, and triggers a
 * download. `fflate` is imported dynamically so it only ends up in a
 * lazily-fetched chunk, not the app's eagerly-loaded bundle.
 */
export async function downloadProjectZip(
  project: PlaygroundProject,
): Promise<CompileForExportResult["status"]> {
  const compileResult = await compileProjectSourceForExport(project.source);
  if (compileResult.status !== "ok") {
    return compileResult.status;
  }

  const entries = buildZipFileEntries(
    compileResult.resolvedSource,
    project.source,
    project.resources,
  );

  const { zipSync } = await import("fflate");
  const zipped = zipSync(entries);
  const blob = new Blob([zipped], { type: "application/zip" });
  triggerBlobDownload(blob, buildExportFileName(project.title, "zip"));

  return "ok";
}
