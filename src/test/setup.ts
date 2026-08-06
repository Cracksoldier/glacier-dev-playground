import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// vitest.config.ts sets `globals: false`, so testing-library's automatic
// cleanup (which relies on a global `afterEach`) must be wired up explicitly.
afterEach(cleanup);

// jsdom does not implement ResizeObserver; react-resizable-panels requires it to mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;
