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

// jsdom has no layout engine, so `Range.getClientRects`/`getBoundingClientRect`
// are unimplemented; CodeMirror 6's internal measurement pass (run on a
// requestAnimationFrame callback) calls both and throws otherwise. Stubbed to
// return empty/zero rects so measurement short-circuits harmlessly — real
// layout, scrolling, and caret positioning are verified in Playwright e2e.
function stubDomRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON() {
      return this;
    },
  };
}

if (typeof Range.prototype.getClientRects !== "function") {
  Range.prototype.getClientRects = function stubGetClientRects() {
    return Object.assign([], { item: () => null }) as unknown as DOMRectList;
  };
}
if (typeof Range.prototype.getBoundingClientRect !== "function") {
  Range.prototype.getBoundingClientRect = stubDomRect;
}
