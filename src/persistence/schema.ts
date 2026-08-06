import type { DBSchema } from "idb";
import type { PlaygroundProject, ProjectId } from "../models/project";

export const DATABASE_NAME = "glacier-dev-playground";

/**
 * IndexedDB *structural* version (object stores/indexes), passed to `idb`'s
 * `openDB`. Deliberately distinct from {@link PROJECT_SCHEMA_VERSION
 * ../models/project.ts}, which versions the *shape* of a single project
 * record. Bump this only when a store or index is added/removed/renamed.
 */
export const DATABASE_VERSION = 1;

export const PROJECTS_STORE = "projects";
export const META_STORE = "meta";

export const META_ACTIVE_PROJECT_ID_KEY = "activeProjectId";
export const META_APP_SCHEMA_VERSION_KEY = "appSchemaVersion";

export interface MetaRecord {
  key: string;
  value: unknown;
}

export interface GlacierDBSchema extends DBSchema {
  [PROJECTS_STORE]: {
    key: ProjectId;
    value: PlaygroundProject;
  };
  [META_STORE]: {
    key: string;
    value: MetaRecord;
  };
}
