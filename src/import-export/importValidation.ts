import type { ProjectSettings, ProjectSource } from "../models/project";
import { recoverProjectRecord } from "../models/projectMigrations";
import { normalizeProjectTitle } from "../models/projectTitle";
import type { ExternalResource } from "../models/resource";
import { validateResourceUrl } from "../models/resourceUrlValidation";

/** Spec §21.2: "Enforce a reasonable file-size limit, initially 5 MB." */
export const IMPORT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** A validated, sanitized subset of an imported project, ready to hand to the reducer. */
export interface ImportedProjectDraft {
  title: string;
  source: ProjectSource;
  resources: ExternalResource[];
  settings: ProjectSettings;
}

export type ImportValidationResult =
  | { status: "ok"; draft: ImportedProjectDraft }
  | { status: "too-large" }
  | { status: "malformed-json" }
  | { status: "unsupported-future-version"; version: number }
  | { status: "invalid"; reason: string };

function invalid(reason: string): { status: "invalid"; reason: string } {
  return { status: "invalid", reason };
}

/**
 * Parses and validates a raw imported project JSON string per spec §21.2:
 * enforces a size limit, rejects malformed JSON and unsupported future
 * schema versions, and deep-validates every nested field before returning a
 * sanitized {@link ImportedProjectDraft}. The draft deliberately omits `id`,
 * `createdAt`, `updatedAt`, `trusted`, and `schemaVersion` — those are always
 * regenerated or force-defaulted by the reducer, never read from the file.
 */
export function parseImportedProjectJson(text: string): ImportValidationResult {
  if (new TextEncoder().encode(text).length > IMPORT_MAX_SIZE_BYTES) {
    return { status: "too-large" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: "malformed-json" };
  }

  // `serializeProjectForExport` deliberately omits `id` (local-only
  // identity, always reminted on import) from the exported document, but
  // `recoverProjectRecord`'s shape check requires one (it was designed to
  // trust the app's own persisted records, which always have it). Since
  // `id` is never read into the draft either way, backfill a placeholder
  // here so a real exported file — not just a file with every field present
  // — can round-trip through import.
  // The same applies to `trusted`, which exports also omit on purpose: the
  // draft never carries it and the reducer forces imports to untrusted, so
  // the placeholder only satisfies the shape check.
  const withPlaceholders =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? {
          ...(parsed as Record<string, unknown>),
          id:
            typeof (parsed as Record<string, unknown>).id === "string"
              ? (parsed as Record<string, unknown>).id
              : "imported-project",
          trusted: false,
        }
      : parsed;

  const recovered = recoverProjectRecord(withPlaceholders);
  if (recovered.status === "unsupported-future-version") {
    return recovered;
  }
  if (recovered.status === "invalid") {
    return invalid(recovered.reason);
  }

  // `recoverProjectRecord` has already validated every nested field's
  // structure; imported files additionally get the resource URL policy,
  // since they're untrusted input from outside the app.
  const project = recovered.project;
  for (const [index, resource] of project.resources.entries()) {
    const urlResult = validateResourceUrl(resource.url, import.meta.env.DEV);
    if (!urlResult.valid) {
      return invalid(`resources[${index}].url: ${urlResult.reason}`);
    }
  }

  return {
    status: "ok",
    draft: {
      title: normalizeProjectTitle(project.title),
      source: project.source,
      resources: project.resources,
      settings: project.settings,
    },
  };
}
