import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// jsdom does not implement IndexedDB; fake-indexeddb is a spec-faithful
// in-memory implementation (not a mock) used by persistence tests.
import "fake-indexeddb/auto";
import { DATABASE_NAME } from "../persistence/schema";

// vitest.config.ts sets `globals: false`, so testing-library's automatic
// cleanup (which relies on a global `afterEach`) must be wired up explicitly.
afterEach(cleanup);

// Component tests that use the default-named database (via the singleton
// repository) get a clean slate each test; tests exercising the repository
// directly use a unique database name per test instead, so this is a no-op
// for them.
afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

// jsdom does not implement ResizeObserver; react-resizable-panels requires it to mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;
