import type { ExternalResourceType } from "./resource";

/**
 * Structural validators for a project's nested fields, shared by the two
 * boundaries where project data arrives as `unknown`: persisted records
 * (`recoverProjectRecord`) and imported JSON (`importValidation.ts`, which
 * layers its URL policy on top). Each returns the first problem found as a
 * human-readable reason.
 */
export type FieldValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

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

export function validateProjectSource(value: unknown): FieldValidationResult {
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

export function validateProjectSettings(value: unknown): FieldValidationResult {
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

/** Structure only — URL policy (e.g. https-only) is the importer's concern. */
export function validateResourceShape(
  value: unknown,
  index: number,
): FieldValidationResult {
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

export function validateProjectResources(
  value: unknown,
): FieldValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, reason: "resources: expected an array." };
  }
  for (let i = 0; i < value.length; i += 1) {
    const result = validateResourceShape(value[i], i);
    if (!result.valid) return result;
  }
  return { valid: true };
}
