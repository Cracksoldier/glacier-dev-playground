import type { ProjectSettings, ProjectSource } from "../models/project";
import { recoverProjectRecord } from "../models/projectMigrations";
import { normalizeProjectTitle } from "../models/projectTitle";
import type {
  ExternalResource,
  ExternalResourceType,
} from "../models/resource";
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

const STYLESHEET_LANGUAGES = new Set(["css", "scss"]);
const SCRIPT_LANGUAGES = new Set(["javascript", "typescript"]);
const EXECUTION_MODES = new Set(["classic", "module"]);
const RESOURCE_TYPES = new Set<ExternalResourceType>([
  "stylesheet",
  "font-stylesheet",
  "script",
  "module",
]);
const CROSS_ORIGINS = new Set(["anonymous", "use-credentials"]);

function invalid(reason: string): { status: "invalid"; reason: string } {
  return { status: "invalid", reason };
}

function validateSource(
  value: unknown,
): { valid: true } | { valid: false; reason: string } {
  if (typeof value !== "object" || value === null) {
    return { valid: false, reason: "source: expected an object." };
  }
  const source = value as Record<string, unknown>;
  if (typeof source.html !== "string") {
    return { valid: false, reason: "source.html: expected a string." };
  }
  if (typeof source.stylesheet !== "string") {
    return { valid: false, reason: "source.stylesheet: expected a string." };
  }
  if (
    typeof source.stylesheetLanguage !== "string" ||
    !STYLESHEET_LANGUAGES.has(source.stylesheetLanguage)
  ) {
    return {
      valid: false,
      reason: 'source.stylesheetLanguage: expected "css" or "scss".',
    };
  }
  if (typeof source.script !== "string") {
    return { valid: false, reason: "source.script: expected a string." };
  }
  if (
    typeof source.scriptLanguage !== "string" ||
    !SCRIPT_LANGUAGES.has(source.scriptLanguage)
  ) {
    return {
      valid: false,
      reason: 'source.scriptLanguage: expected "javascript" or "typescript".',
    };
  }
  if (
    typeof source.executionMode !== "string" ||
    !EXECUTION_MODES.has(source.executionMode)
  ) {
    return {
      valid: false,
      reason: 'source.executionMode: expected "classic" or "module".',
    };
  }
  if (typeof source.headContent !== "string") {
    return { valid: false, reason: "source.headContent: expected a string." };
  }
  return { valid: true };
}

function validateSettings(
  value: unknown,
): { valid: true } | { valid: false; reason: string } {
  if (typeof value !== "object" || value === null) {
    return { valid: false, reason: "settings: expected an object." };
  }
  const settings = value as Record<string, unknown>;
  if (typeof settings.autoRun !== "boolean") {
    return { valid: false, reason: "settings.autoRun: expected a boolean." };
  }
  if (
    typeof settings.previewDebounceMs !== "number" ||
    !Number.isFinite(settings.previewDebounceMs) ||
    settings.previewDebounceMs < 0
  ) {
    return {
      valid: false,
      reason: "settings.previewDebounceMs: expected a finite number >= 0.",
    };
  }
  if (typeof settings.preserveConsole !== "boolean") {
    return {
      valid: false,
      reason: "settings.preserveConsole: expected a boolean.",
    };
  }
  return { valid: true };
}

function validateResource(
  value: unknown,
  index: number,
): { valid: true } | { valid: false; reason: string } {
  if (typeof value !== "object" || value === null) {
    return { valid: false, reason: `resources[${index}]: expected an object.` };
  }
  const resource = value as Record<string, unknown>;
  if (typeof resource.id !== "string") {
    return {
      valid: false,
      reason: `resources[${index}].id: expected a string.`,
    };
  }
  if (typeof resource.name !== "string") {
    return {
      valid: false,
      reason: `resources[${index}].name: expected a string.`,
    };
  }
  if (typeof resource.url !== "string") {
    return {
      valid: false,
      reason: `resources[${index}].url: expected a string.`,
    };
  }
  const urlResult = validateResourceUrl(resource.url, import.meta.env.DEV);
  if (!urlResult.valid) {
    return {
      valid: false,
      reason: `resources[${index}].url: ${urlResult.reason}`,
    };
  }
  if (
    typeof resource.type !== "string" ||
    !RESOURCE_TYPES.has(resource.type as ExternalResourceType)
  ) {
    return {
      valid: false,
      reason: `resources[${index}].type: expected a valid resource type.`,
    };
  }
  if (typeof resource.enabled !== "boolean") {
    return {
      valid: false,
      reason: `resources[${index}].enabled: expected a boolean.`,
    };
  }
  if (typeof resource.order !== "number" || !Number.isFinite(resource.order)) {
    return {
      valid: false,
      reason: `resources[${index}].order: expected a finite number.`,
    };
  }
  if (
    resource.integrity !== undefined &&
    typeof resource.integrity !== "string"
  ) {
    return {
      valid: false,
      reason: `resources[${index}].integrity: expected a string when present.`,
    };
  }
  if (
    resource.crossOrigin !== undefined &&
    (typeof resource.crossOrigin !== "string" ||
      !CROSS_ORIGINS.has(resource.crossOrigin))
  ) {
    return {
      valid: false,
      reason: `resources[${index}].crossOrigin: expected "anonymous" or "use-credentials" when present.`,
    };
  }
  return { valid: true };
}

/**
 * Deep-validates a recovered project's nested fields. {@link recoverProjectRecord}
 * only checks top-level shape (it trusts the app's own prior writes) — imported
 * JSON is untrusted input from outside the app and needs every nested field
 * checked before it's safe to fold into the store.
 */
function validateDeepShape(
  record: Record<string, unknown>,
): { valid: true } | { valid: false; reason: string } {
  const sourceResult = validateSource(record.source);
  if (!sourceResult.valid) return sourceResult;

  const settingsResult = validateSettings(record.settings);
  if (!settingsResult.valid) return settingsResult;

  const resources = record.resources;
  if (!Array.isArray(resources)) {
    return { valid: false, reason: "resources: expected an array." };
  }
  for (let i = 0; i < resources.length; i += 1) {
    const resourceResult = validateResource(resources[i], i);
    if (!resourceResult.valid) return resourceResult;
  }

  return { valid: true };
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
  const withPlaceholderId =
    typeof parsed === "object" &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    typeof (parsed as Record<string, unknown>).id !== "string"
      ? { ...(parsed as Record<string, unknown>), id: "imported-project" }
      : parsed;

  const recovered = recoverProjectRecord(withPlaceholderId);
  if (recovered.status === "unsupported-future-version") {
    return recovered;
  }
  if (recovered.status === "invalid") {
    return invalid(recovered.reason);
  }

  const record = recovered.project as unknown as Record<string, unknown>;
  const deepResult = validateDeepShape(record);
  if (!deepResult.valid) {
    return invalid(deepResult.reason);
  }

  const project = recovered.project;
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
