import { describe, expect, it } from "vitest";
import { openDatabase } from "./db";
import { META_STORE, PROJECTS_STORE } from "./schema";

describe("openDatabase", () => {
  it("creates the projects and meta object stores on first open", async () => {
    const db = await openDatabase(`test-${crypto.randomUUID()}`);

    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([PROJECTS_STORE, META_STORE]),
    );

    db.close();
  });
});
