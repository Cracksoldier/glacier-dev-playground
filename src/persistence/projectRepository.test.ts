import { describe, expect, it } from "vitest";
import type { PlaygroundProject } from "../models/project";
import { PROJECT_TEMPLATES } from "../models/templates";
import { openDatabase } from "./db";
import {
  createIndexedDbProjectRepository,
  createUnavailableProjectRepository,
  StorageUnavailableError,
} from "./projectRepository";
import { META_STORE, PROJECTS_STORE } from "./schema";

function uniqueDatabaseName(): string {
  return `test-${crypto.randomUUID()}`;
}

function makeProject(title: string): PlaygroundProject {
  return { ...PROJECT_TEMPLATES.empty.create(), title };
}

describe("createIndexedDbProjectRepository", () => {
  it("load() returns a null snapshot when nothing has been persisted", async () => {
    const repository = createIndexedDbProjectRepository({
      databaseName: uniqueDatabaseName(),
    });

    const result = await repository.load();

    expect(result).toEqual({
      snapshot: null,
      recoveredCount: 0,
      rejectedNewerAppVersion: false,
    });
  });

  it("round-trips a saved snapshot through load()", async () => {
    const databaseName = uniqueDatabaseName();
    const repository = createIndexedDbProjectRepository({ databaseName });
    const projectA = makeProject("A");
    const projectB = makeProject("B");

    await repository.saveSnapshot({
      projects: [projectA, projectB],
      activeProjectId: projectB.id,
    });

    const result = await repository.load();

    expect(result.recoveredCount).toBe(0);
    expect(result.rejectedNewerAppVersion).toBe(false);
    expect(result.snapshot?.activeProjectId).toBe(projectB.id);
    expect(result.snapshot?.projects.map((p) => p.id).sort()).toEqual(
      [projectA.id, projectB.id].sort(),
    );
  });

  it("a later saveSnapshot() fully replaces the project list (deletions persist)", async () => {
    const databaseName = uniqueDatabaseName();
    const repository = createIndexedDbProjectRepository({ databaseName });
    const projectA = makeProject("A");
    const projectB = makeProject("B");

    await repository.saveSnapshot({
      projects: [projectA, projectB],
      activeProjectId: projectA.id,
    });
    await repository.saveSnapshot({
      projects: [projectA],
      activeProjectId: projectA.id,
    });

    const result = await repository.load();

    expect(result.snapshot?.projects).toHaveLength(1);
    expect(result.snapshot?.projects[0].id).toBe(projectA.id);
  });

  it("skips a corrupt record on load, counts it, and keeps valid siblings", async () => {
    const databaseName = uniqueDatabaseName();
    const repository = createIndexedDbProjectRepository({ databaseName });
    const validProject = makeProject("Valid");
    await repository.saveSnapshot({
      projects: [validProject],
      activeProjectId: validProject.id,
    });

    // Bypass the repository to inject a malformed record directly.
    const db = await openDatabase(databaseName);
    await db.put(PROJECTS_STORE, {
      // biome-ignore lint/suspicious/noExplicitAny: intentionally malformed test fixture
      ...({ id: "corrupt-1", schemaVersion: 1, title: 42 } as any),
    });
    db.close();

    const result = await repository.load();

    expect(result.recoveredCount).toBe(1);
    expect(result.snapshot?.projects).toHaveLength(1);
    expect(result.snapshot?.projects[0].id).toBe(validProject.id);
  });

  it("keeps an unreadable record on disk across later saves until resetAllData()", async () => {
    const databaseName = uniqueDatabaseName();
    const repository = createIndexedDbProjectRepository({ databaseName });
    const keptProject = makeProject("Kept");
    const deletedProject = makeProject("Deleted");
    await repository.saveSnapshot({
      projects: [keptProject, deletedProject],
      activeProjectId: keptProject.id,
    });

    const seedDb = await openDatabase(databaseName);
    await seedDb.put(PROJECTS_STORE, {
      // biome-ignore lint/suspicious/noExplicitAny: intentionally malformed test fixture
      ...({ id: "corrupt-1", schemaVersion: 1, title: 42 } as any),
    });
    seedDb.close();

    await repository.load();
    await repository.saveSnapshot({
      projects: [keptProject],
      activeProjectId: keptProject.id,
    });

    const db = await openDatabase(databaseName);
    const keysAfterSave = await db.getAllKeys(PROJECTS_STORE);
    db.close();
    expect([...keysAfterSave].sort()).toEqual(
      ["corrupt-1", keptProject.id].sort(),
    );

    await repository.resetAllData();
    const resetDb = await openDatabase(databaseName);
    expect(await resetDb.getAllKeys(PROJECTS_STORE)).toEqual([]);
    resetDb.close();
  });

  it("falls back to the first project when the persisted active id is missing", async () => {
    const databaseName = uniqueDatabaseName();
    const repository = createIndexedDbProjectRepository({ databaseName });
    const projectA = makeProject("A");

    await repository.saveSnapshot({
      projects: [projectA],
      activeProjectId: "does-not-exist",
    });

    const result = await repository.load();

    expect(result.snapshot?.activeProjectId).toBe(projectA.id);
  });

  it("rejects data written by a newer app schema version without touching projects", async () => {
    const databaseName = uniqueDatabaseName();
    const repository = createIndexedDbProjectRepository({ databaseName });
    const projectA = makeProject("A");
    await repository.saveSnapshot({
      projects: [projectA],
      activeProjectId: projectA.id,
    });

    const db = await openDatabase(databaseName);
    await db.put(META_STORE, { key: "appSchemaVersion", value: 999 });
    db.close();

    const result = await repository.load();

    expect(result).toEqual({
      snapshot: null,
      recoveredCount: 0,
      rejectedNewerAppVersion: true,
    });
  });

  it("resetAllData() clears both stores", async () => {
    const databaseName = uniqueDatabaseName();
    const repository = createIndexedDbProjectRepository({ databaseName });
    const projectA = makeProject("A");
    await repository.saveSnapshot({
      projects: [projectA],
      activeProjectId: projectA.id,
    });

    await repository.resetAllData();

    const result = await repository.load();
    expect(result.snapshot).toBeNull();
  });
});

describe("createUnavailableProjectRepository", () => {
  it("every method rejects with StorageUnavailableError", async () => {
    const repository = createUnavailableProjectRepository();

    await expect(repository.load()).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    await expect(
      repository.saveSnapshot({ projects: [], activeProjectId: "x" }),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(repository.resetAllData()).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
  });
});
