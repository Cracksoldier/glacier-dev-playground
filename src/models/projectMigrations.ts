import { type PlaygroundProject, PROJECT_SCHEMA_VERSION } from "./project";
import {
  type FieldValidationResult,
  validateProjectResources,
  validateProjectSettings,
  validateProjectSource,
} from "./projectValidation";

/**
 * Transforms a raw persisted record from schema version N to N+1.
 * Keyed in {@link PROJECT_MIGRATIONS} by the version it migrates *from*.
 */
export type ProjectMigrationStep = (
  input: Record<string, unknown>,
) => Record<string, unknown>;

/** Add an entry here (keyed by the version being migrated away from) whenever {@link PROJECT_SCHEMA_VERSION} bumps. */
export const PROJECT_MIGRATIONS: Record<number, ProjectMigrationStep> = {
  // v1 -> v2: `trusted` was added while records were still written as v1,
  // so a v1 record may or may not carry it. Records from before the field
  // existed were all created locally, so they default to trusted; an
  // explicit value (including an imported project's `false`) is kept.
  1: (input) => ({
    ...input,
    trusted: typeof input.trusted === "boolean" ? input.trusted : true,
  }),
};

export type ProjectRecoveryResult =
  | { status: "ok"; project: PlaygroundProject }
  | { status: "unsupported-future-version"; version: number }
  | { status: "invalid"; reason: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateProjectRecordShape(
  record: Record<string, unknown>,
): FieldValidationResult {
  for (const field of ["id", "title", "createdAt", "updatedAt"] as const) {
    if (typeof record[field] !== "string") {
      return { valid: false, reason: `${field}: expected a string.` };
    }
  }
  if (typeof record.trusted !== "boolean") {
    return { valid: false, reason: "trusted: expected a boolean." };
  }
  const sourceResult = validateProjectSource(record.source);
  if (!sourceResult.valid) return sourceResult;
  const settingsResult = validateProjectSettings(record.settings);
  if (!settingsResult.valid) return settingsResult;
  return validateProjectResources(record.resources);
}

/**
 * Validates and migrates a raw record read from persistence into a trusted
 * {@link PlaygroundProject}. This is the one boundary in the codebase where
 * data from outside the app's own writes must be treated as `unknown` before
 * use, per the strict-mode "no unchecked cast without justification" rule.
 */
export function recoverProjectRecord(
  raw: unknown,
  currentVersion: number = PROJECT_SCHEMA_VERSION,
  migrations: Record<number, ProjectMigrationStep> = PROJECT_MIGRATIONS,
): ProjectRecoveryResult {
  if (!isPlainObject(raw)) {
    return { status: "invalid", reason: "Record is not a plain object." };
  }

  const rawVersion = raw.schemaVersion;
  if (typeof rawVersion !== "number" || !Number.isInteger(rawVersion)) {
    return {
      status: "invalid",
      reason: "Missing or non-integer schemaVersion.",
    };
  }

  if (rawVersion > currentVersion) {
    return { status: "unsupported-future-version", version: rawVersion };
  }

  let record = raw;
  let version = rawVersion;
  while (version < currentVersion) {
    const step = migrations[version];
    if (!step) {
      return {
        status: "invalid",
        reason: `No migration registered for schema version ${version}.`,
      };
    }
    record = step(record);
    version += 1;
  }

  const migrated: Record<string, unknown> = {
    ...record,
    schemaVersion: currentVersion,
  };
  const shape = validateProjectRecordShape(migrated);
  if (!shape.valid) {
    return { status: "invalid", reason: shape.reason };
  }

  // Every field of PlaygroundProject, nested ones included, was validated
  // just above — this is the documented unknown-to-typed boundary.
  return { status: "ok", project: migrated as unknown as PlaygroundProject };
}
