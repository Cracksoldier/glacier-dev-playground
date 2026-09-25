import { afterEach, describe, expect, it, vi } from "vitest";
import { TS_WORKER_PROTOCOL, TS_WORKER_VERSION } from "./tsWorkerProtocol";

vi.mock("./tsCompiler", () => ({
  compileScript: () => {
    throw new Error("internal compiler crash");
  },
}));

afterEach(() => {
  self.onmessage = null;
  vi.restoreAllMocks();
});

describe("tsCompiler.worker", () => {
  it("answers with a blocking diagnostic when compileScript throws, so the request never hangs", async () => {
    const postMessage = vi
      .spyOn(self, "postMessage")
      .mockImplementation(() => {});
    await import("./tsCompiler.worker");

    self.onmessage?.(
      new MessageEvent("message", {
        data: {
          protocol: TS_WORKER_PROTOCOL,
          version: TS_WORKER_VERSION,
          buildId: "build-1",
          source: "const a = 1;",
          scriptLanguage: "typescript",
          executionMode: "classic",
        },
      }),
    );

    expect(postMessage).toHaveBeenCalledWith({
      protocol: TS_WORKER_PROTOCOL,
      version: TS_WORKER_VERSION,
      buildId: "build-1",
      diagnostics: [
        {
          message: expect.stringContaining("internal compiler crash"),
          category: "error",
        },
      ],
      emittedJs: null,
      lineMap: null,
    });
  });
});
