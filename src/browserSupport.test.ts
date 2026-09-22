import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectUnsupportedBrowser } from "./browserSupport";

// jsdom provides no Worker, so the supported-browser baseline has to supply
// one; individual cases remove it again to assert the gate notices.
class WorkerStub {
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}

beforeEach(() => {
  vi.stubGlobal("Worker", WorkerStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Stands in for a browser whose iframes have no `sandbox` property, by
 * handing back an element type that genuinely lacks one.
 */
function stubIframeWithoutSandbox() {
  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) =>
    realCreateElement(tagName === "iframe" ? "div" : tagName, options),
  );
}

describe("detectUnsupportedBrowser", () => {
  it("returns null in a browser providing every required API", () => {
    expect(detectUnsupportedBrowser()).toBeNull();
  });

  it("reports a missing Worker constructor", () => {
    vi.stubGlobal("Worker", undefined);
    expect(detectUnsupportedBrowser()).toEqual([
      expect.stringContaining("Web Workers"),
    ]);
  });

  it("reports missing iframe sandbox support", () => {
    stubIframeWithoutSandbox();
    expect(detectUnsupportedBrowser()).toEqual([
      expect.stringContaining("Sandboxed iframes"),
    ]);
  });

  it("reports a missing crypto.randomUUID", () => {
    vi.stubGlobal("crypto", {});
    expect(detectUnsupportedBrowser()).toEqual([
      expect.stringContaining("crypto.randomUUID"),
    ]);
  });

  it("reports every missing API at once", () => {
    vi.stubGlobal("Worker", undefined);
    vi.stubGlobal("crypto", {});
    expect(detectUnsupportedBrowser()).toHaveLength(2);
  });
});
