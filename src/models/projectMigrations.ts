import { type PlaygroundProject, PROJECT_SCHEMA_VERSION } from "./project";

/**
 * Transforms a raw persisted record from schema version N to N+1.
 * Keyed in {@link PROJECT_MIGRATIONS} by the version it migrates *from*.
 */
export type ProjectMigrationStep = (
  input: Record<string, unknown>,
) => Record<string, unknown>;

/**
 * Empty today: the persisted schema has been version 1 since inception.
 * Add an entry here (keyed by the version being migrated away from) the
 * next time {@link PROJECT_SCHEMA_VERSION} bumps.
 */
export const PROJECT_MIGRATIONS: Record<number, ProjectMigrationStep> = {};

export type ProjectRecoveryResult =
  | { status: "ok"; project: PlaygroundProject }
  | { status: "unsupported-future-version"; version: number }
  | { status: "invalid"; reason: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValidShape(
  record: Record<string, unknown>,
): record is Record<string, unknown> & PlaygroundProject {
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    isPlainObject(record.source) &&
    Array.isArray(record.resources) &&
    isPlainObject(record.settings)
  );
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

  const migrated = { ...record, schemaVersion: currentVersion };
  if (!hasValidShape(migrated)) {
    return {
      status: "invalid",
      reason: "Record does not match the expected project shape.",
    };
  }

  return { status: "ok", project: migrated };
}
