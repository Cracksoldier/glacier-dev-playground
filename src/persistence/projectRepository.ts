import {
  type PlaygroundProject,
  PROJECT_SCHEMA_VERSION,
  type ProjectId,
} from "../models/project";
import { recoverProjectRecord } from "../models/projectMigrations";
import { openDatabase } from "./db";
import {
  META_ACTIVE_PROJECT_ID_KEY,
  META_APP_SCHEMA_VERSION_KEY,
  META_STORE,
  PROJECTS_STORE,
} from "./schema";

export class StorageUnavailableError extends Error {
  constructor(
    message = "IndexedDB is unavailable in this environment.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StorageUnavailableError";
  }
}

export interface ProjectSnapshot {
  projects: PlaygroundProject[];
  activeProjectId: ProjectId;
}

export interface LoadResult {
  /** `null` means nothing has ever been persisted (first run). */
  snapshot: ProjectSnapshot | null;
  /** Number of persisted records skipped this load (invalid shape or unsupported future version). */
  recoveredCount: number;
  /** True if the persisted data was written by a newer, incompatible app version. */
  rejectedNewerAppVersion: boolean;
}

export interface ProjectRepository {
  load(): Promise<LoadResult>;
  saveSnapshot(snapshot: ProjectSnapshot): Promise<void>;
  /** Wipes all persisted project data. Always explicit — never called automatically. */
  resetAllData(): Promise<void>;
}

export function createIndexedDbProjectRepository(options?: {
  databaseName?: string;
}): ProjectRepository {
  const databaseName = options?.databaseName;

  async function open() {
    try {
      return await openDatabase(databaseName);
    } catch (error) {
      throw new StorageUnavailableError(undefined, { cause: error });
    }
  }

  return {
    async load(): Promise<LoadResult> {
      const db = await open();

      const appSchemaVersionRecord = await db.get(
        META_STORE,
        META_APP_SCHEMA_VERSION_KEY,
      );
      const persistedAppSchemaVersion = appSchemaVersionRecord?.value;
      if (
        typeof persistedAppSchemaVersion === "number" &&
        persistedAppSchemaVersion > PROJECT_SCHEMA_VERSION
      ) {
        return {
          snapshot: null,
          recoveredCount: 0,
          rejectedNewerAppVersion: true,
        };
      }

      const rawProjects = await db.getAll(PROJECTS_STORE);
      const projects: PlaygroundProject[] = [];
      let recoveredCount = 0;
      for (const raw of rawProjects) {
        // `raw` is typed as PlaygroundProject by idb's schema, but a record on
        // disk may have been written by a different app version or edited
        // out-of-band — recover it as unknown data before trusting it.
        const result = recoverProjectRecord(raw as unknown);
        if (result.status === "ok") {
          projects.push(result.project);
        } else {
          recoveredCount += 1;
        }
      }

      if (projects.length === 0) {
        return {
          snapshot: null,
          recoveredCount,
          rejectedNewerAppVersion: false,
        };
      }

      const activeProjectIdRecord = await db.get(
        META_STORE,
        META_ACTIVE_PROJECT_ID_KEY,
      );
      const persistedActiveId = activeProjectIdRecord?.value;
      const activeProjectId =
        typeof persistedActiveId === "string" &&
        projects.some((project) => project.id === persistedActiveId)
          ? persistedActiveId
          : projects[0].id;

      return {
        snapshot: { projects, activeProjectId },
        recoveredCount,
        rejectedNewerAppVersion: false,
      };
    },

    async saveSnapshot(snapshot: ProjectSnapshot): Promise<void> {
      const db = await open();
      const tx = db.transaction([PROJECTS_STORE, META_STORE], "readwrite");
      await tx.objectStore(PROJECTS_STORE).clear();
      for (const project of snapshot.projects) {
        await tx.objectStore(PROJECTS_STORE).put(project);
      }
      await tx.objectStore(META_STORE).put({
        key: META_ACTIVE_PROJECT_ID_KEY,
        value: snapshot.activeProjectId,
      });
      await tx.objectStore(META_STORE).put({
        key: META_APP_SCHEMA_VERSION_KEY,
        value: PROJECT_SCHEMA_VERSION,
      });
      await tx.done;
    },

    async resetAllData(): Promise<void> {
      const db = await open();
      const tx = db.transaction([PROJECTS_STORE, META_STORE], "readwrite");
      await tx.objectStore(PROJECTS_STORE).clear();
      await tx.objectStore(META_STORE).clear();
      await tx.done;
    },
  };
}

export function createUnavailableProjectRepository(): ProjectRepository {
  const fail = () => Promise.reject(new StorageUnavailableError());
  return { load: fail, saveSnapshot: fail, resetAllData: fail };
}
