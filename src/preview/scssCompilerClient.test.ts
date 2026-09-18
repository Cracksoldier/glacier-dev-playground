import { describe, expect, it, vi } from "vitest";
import {
  createScssCompilerClient,
  type WorkerLike,
} from "./scssCompilerClient";
import {
  SCSS_WORKER_PROTOCOL,
  SCSS_WORKER_VERSION,
} from "./scssWorkerProtocol";

/**
 * A fake in-process transport standing in for a real `Worker`: `postMessage`
 * pushes onto a queue rather than crossing a thread boundary, and tests
 * control exactly when/in what order responses are delivered by calling
 * `respond`/`respondInOrder` themselves.
 */
function createFakeWorker() {
  const posted: unknown[] = [];
  let onmessageHandler: ((event: MessageEvent) => void) | null = null;
  const terminate = vi.fn();
  const worker: WorkerLike = {
    postMessage: (data) => posted.push(data),
    set onmessage(handler: ((event: MessageEvent) => void) | null) {
      onmessageHandler = handler;
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
  };
}

describe("createScssCompilerClient", () => {
  it("resolves compile() with the response matching its buildId, even out of order", async () => {
    const fake = createFakeWorker();
    const client = createScssCompilerClient(() => fake.worker);

    const first = client.compile(".a { color: red; }", "build-1");
    const second = client.compile(".b { color: blue; }", "build-2");

    expect(fake.posted).toEqual([
      {
        protocol: SCSS_WORKER_PROTOCOL,
        version: SCSS_WORKER_VERSION,
        buildId: "build-1",
        source: ".a { color: red; }",
      },
      {
        protocol: SCSS_WORKER_PROTOCOL,
        version: SCSS_WORKER_VERSION,
        buildId: "build-2",
        source: ".b { color: blue; }",
      },
    ]);

    // Respond to the second request first, simulating a slower first compile.
    fake.respond({
      protocol: SCSS_WORKER_PROTOCOL,
      version: SCSS_WORKER_VERSION,
      buildId: "build-2",
      type: "success",
      css: ".b { color: blue; }",
    });
    fake.respond({
      protocol: SCSS_WORKER_PROTOCOL,
      version: SCSS_WORKER_VERSION,
      buildId: "build-1",
      type: "failure",
      error: { message: "boom" },
    });

    await expect(second).resolves.toEqual({
      type: "success",
      css: ".b { color: blue; }",
    });
    await expect(first).resolves.toEqual({
      type: "failure",
      error: { message: "boom" },
    });
  });

  it("creates the worker lazily, only on the first compile() call", () => {
    const createWorker = vi.fn(() => createFakeWorker().worker);
    createScssCompilerClient(createWorker);
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("reuses the same worker across multiple compile() calls", () => {
    const fake = createFakeWorker();
    const createWorker = vi.fn(() => fake.worker);
    const client = createScssCompilerClient(createWorker);

    client.compile("a", "build-1");
    client.compile("b", "build-2");

    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it("ignores a response with an unknown buildId", async () => {
    const fake = createFakeWorker();
    const client = createScssCompilerClient(() => fake.worker);

    const promise = client.compile(".a {}", "build-1");
    fake.respond({
      protocol: SCSS_WORKER_PROTOCOL,
      version: SCSS_WORKER_VERSION,
      buildId: "unknown-build",
      type: "success",
      css: "",
    });
    fake.respond({
      protocol: SCSS_WORKER_PROTOCOL,
      version: SCSS_WORKER_VERSION,
      buildId: "build-1",
      type: "success",
      css: ".a {}",
    });

    await expect(promise).resolves.toEqual({ type: "success", css: ".a {}" });
  });

  it("ignores a malformed response", async () => {
    const fake = createFakeWorker();
    const client = createScssCompilerClient(() => fake.worker);

    const promise = client.compile(".a {}", "build-1");
    fake.respond({ not: "a valid response" });
    fake.respond({
      protocol: SCSS_WORKER_PROTOCOL,
      version: SCSS_WORKER_VERSION,
      buildId: "build-1",
      type: "success",
      css: ".a {}",
    });

    await expect(promise).resolves.toEqual({ type: "success", css: ".a {}" });
  });

  it("dispose() terminates the worker and clears pending requests", () => {
    const fake = createFakeWorker();
    const client = createScssCompilerClient(() => fake.worker);

    client.compile(".a {}", "build-1");
    client.dispose();

    expect(fake.terminate).toHaveBeenCalledTimes(1);
  });

  it("dispose() before any compile() call does not create a worker or throw", () => {
    const createWorker = vi.fn(() => createFakeWorker().worker);
    const client = createScssCompilerClient(createWorker);
    expect(() => client.dispose()).not.toThrow();
    expect(createWorker).not.toHaveBeenCalled();
  });
});
