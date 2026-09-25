import { describe, expect, it, vi } from "vitest";
import { createTsCompilerClient } from "./tsCompilerClient";
import { TS_WORKER_PROTOCOL, TS_WORKER_VERSION } from "./tsWorkerProtocol";
import type { WorkerLike } from "./workerLike";

/**
 * A fake in-process transport standing in for a real `Worker`: `postMessage`
 * pushes onto a queue rather than crossing a thread boundary, and tests
 * control exactly when/in what order responses are delivered by calling
 * `respond` themselves.
 */
function createFakeWorker() {
  const posted: unknown[] = [];
  let onmessageHandler: ((event: MessageEvent) => void) | null = null;
  let onerrorHandler: ((event: ErrorEvent) => void) | null = null;
  const terminate = vi.fn();
  const worker: WorkerLike = {
    postMessage: (data) => posted.push(data),
    set onmessage(handler: ((event: MessageEvent) => void) | null) {
      onmessageHandler = handler;
    },
    set onerror(handler: ((event: ErrorEvent) => void) | null) {
      onerrorHandler = handler;
    },
    terminate,
  };
  return {
    worker,
    posted,
    terminate,
    respond(data: unknown) {
      onmessageHandler?.({ data } as MessageEvent);
    },
    crash() {
      onerrorHandler?.(new ErrorEvent("error"));
    },
  };
}

describe("createTsCompilerClient", () => {
  it("resolves compile() with the response matching its buildId, even out of order", async () => {
    const fake = createFakeWorker();
    const client = createTsCompilerClient(() => fake.worker);

    const first = client.compile(
      "const a = 1;",
      "javascript",
      "classic",
      "build-1",
    );
    const second = client.compile(
      "const b: number = 2;",
      "typescript",
      "module",
      "build-2",
    );

    expect(fake.posted).toEqual([
      {
        protocol: TS_WORKER_PROTOCOL,
        version: TS_WORKER_VERSION,
        buildId: "build-1",
        source: "const a = 1;",
        scriptLanguage: "javascript",
        executionMode: "classic",
      },
      {
        protocol: TS_WORKER_PROTOCOL,
        version: TS_WORKER_VERSION,
        buildId: "build-2",
        source: "const b: number = 2;",
        scriptLanguage: "typescript",
        executionMode: "module",
      },
    ]);

    // Respond to the second request first, simulating a slower first compile.
    fake.respond({
      protocol: TS_WORKER_PROTOCOL,
      version: TS_WORKER_VERSION,
      buildId: "build-2",
      diagnostics: [],
      emittedJs: "const b = 2;",
      lineMap: [1],
    });
    fake.respond({
      protocol: TS_WORKER_PROTOCOL,
      version: TS_WORKER_VERSION,
      buildId: "build-1",
      diagnostics: [{ message: "boom", category: "error", line: 1 }],
      emittedJs: null,
      lineMap: null,
    });

    await expect(second).resolves.toEqual({
      diagnostics: [],
      emittedJs: "const b = 2;",
      lineMap: [1],
    });
    await expect(first).resolves.toEqual({
      diagnostics: [{ message: "boom", category: "error", line: 1 }],
      emittedJs: null,
      lineMap: null,
    });
  });

  it("creates the worker lazily, only on the first compile() call", () => {
    const createWorker = vi.fn(() => createFakeWorker().worker);
    createTsCompilerClient(createWorker);
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("reuses the same worker across multiple compile() calls", () => {
    const fake = createFakeWorker();
    const createWorker = vi.fn(() => fake.worker);
    const client = createTsCompilerClient(createWorker);

    client.compile("a", "javascript", "classic", "build-1");
    client.compile("b", "javascript", "classic", "build-2");

    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it("ignores a response with an unknown buildId", async () => {
    const fake = createFakeWorker();
    const client = createTsCompilerClient(() => fake.worker);

    const promise = client.compile(
      "const a = 1;",
      "javascript",
      "classic",
      "build-1",
    );
    fake.respond({
      protocol: TS_WORKER_PROTOCOL,
      version: TS_WORKER_VERSION,
      buildId: "unknown-build",
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap: null,
    });
    fake.respond({
      protocol: TS_WORKER_PROTOCOL,
      version: TS_WORKER_VERSION,
      buildId: "build-1",
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap: null,
    });

    await expect(promise).resolves.toEqual({
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap: null,
    });
  });

  it("ignores a malformed response", async () => {
    const fake = createFakeWorker();
    const client = createTsCompilerClient(() => fake.worker);

    const promise = client.compile(
      "const a = 1;",
      "javascript",
      "classic",
      "build-1",
    );
    fake.respond({ not: "a valid response" });
    fake.respond({
      protocol: TS_WORKER_PROTOCOL,
      version: TS_WORKER_VERSION,
      buildId: "build-1",
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap: null,
    });

    await expect(promise).resolves.toEqual({
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap: null,
    });
  });

  it("dispose() terminates the worker and clears pending requests", () => {
    const fake = createFakeWorker();
    const client = createTsCompilerClient(() => fake.worker);

    client.compile("const a = 1;", "javascript", "classic", "build-1");
    client.dispose();

    expect(fake.terminate).toHaveBeenCalledTimes(1);
  });

  it("dispose() before any compile() call does not create a worker or throw", () => {
    const createWorker = vi.fn(() => createFakeWorker().worker);
    const client = createTsCompilerClient(createWorker);
    expect(() => client.dispose()).not.toThrow();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("settles every pending compile with a failure when the worker errors, then spawns a fresh worker", async () => {
    const first = createFakeWorker();
    const second = createFakeWorker();
    const createWorker = vi
      .fn()
      .mockReturnValueOnce(first.worker)
      .mockReturnValueOnce(second.worker);
    const client = createTsCompilerClient(createWorker);

    const a = client.compile(
      "const a = 1;",
      "javascript",
      "classic",
      "build-1",
    );
    const b = client.compile(
      "const a = 1;",
      "javascript",
      "classic",
      "build-2",
    );
    first.crash();

    await expect(a).resolves.toEqual({
      diagnostics: [
        {
          message: expect.stringContaining("stopped unexpectedly"),
          category: "error",
        },
      ],
      emittedJs: null,
      lineMap: null,
    });
    await expect(b).resolves.toEqual({
      diagnostics: [
        {
          message: expect.stringContaining("stopped unexpectedly"),
          category: "error",
        },
      ],
      emittedJs: null,
      lineMap: null,
    });
    expect(first.terminate).toHaveBeenCalledTimes(1);

    const retried = client.compile(
      "const a = 1;",
      "javascript",
      "classic",
      "build-3",
    );
    expect(createWorker).toHaveBeenCalledTimes(2);
    second.respond({
      protocol: TS_WORKER_PROTOCOL,
      version: TS_WORKER_VERSION,
      buildId: "build-3",
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap: null,
    });
    await expect(retried).resolves.toEqual({
      diagnostics: [],
      emittedJs: "const a = 1;",
      lineMap: null,
    });
  });

  it("resolves with a failure instead of throwing when the worker cannot be created", async () => {
    const client = createTsCompilerClient(() => {
      throw new Error("Worker construction blocked");
    });

    await expect(
      client.compile("const a = 1;", "javascript", "classic", "build-1"),
    ).resolves.toEqual({
      diagnostics: [
        {
          message: expect.stringContaining("stopped unexpectedly"),
          category: "error",
        },
      ],
      emittedJs: null,
      lineMap: null,
    });
  });
});
