import type { ScssCompileResult } from "./scssCompiler";
import {
  isScssCompileResponse,
  SCSS_WORKER_PROTOCOL,
  SCSS_WORKER_VERSION,
} from "./scssWorkerProtocol";

/**
 * The subset of the `Worker` API this client depends on. Lets tests inject
 * a fake in-process transport instead of a real `Worker`, since jsdom (this
 * repo's Vitest environment) has no real Worker implementation.
 */
export interface WorkerLike {
  postMessage(data: unknown): void;
  set onmessage(handler: ((event: MessageEvent) => void) | null);
  terminate(): void;
}

export interface ScssCompilerClient {
  /**
   * Sends `source` to the worker tagged with `buildId`, resolving with the
   * matching response whenever it arrives — including out of order relative
   * to other concurrent `compile()` calls. Callers are responsible for
   * discarding results that are stale by the time they resolve (see
   * `PreviewFrame.tsx`'s `coordinator.isStale` recheck).
   */
  compile(source: string, buildId: string): Promise<ScssCompileResult>;
  /** Terminates the underlying worker (if created) and drops pending requests. */
  dispose(): void;
}

function defaultCreateWorker(): WorkerLike {
  return new Worker(new URL("./scssCompiler.worker.ts", import.meta.url), {
    type: "module",
  });
}

/**
 * Owns a single SCSS compiler Worker's lifecycle. The worker is created
 * lazily on the first `compile()` call and reused for the client's lifetime
 * — spawning a fresh worker per compile would force re-paying Dart Sass's
 * lazy-load cost on every keystroke.
 */
export function createScssCompilerClient(
  createWorker: () => WorkerLike = defaultCreateWorker,
): ScssCompilerClient {
  let worker: WorkerLike | null = null;
  const pending = new Map<string, (result: ScssCompileResult) => void>();

  function ensureWorker(): WorkerLike {
    if (worker) return worker;
    const created = createWorker();
    created.onmessage = (event) => {
      if (!isScssCompileResponse(event.data)) return;
      const resolve = pending.get(event.data.buildId);
      if (!resolve) return;
      pending.delete(event.data.buildId);
      resolve(
        event.data.type === "success"
          ? { type: "success", css: event.data.css }
          : { type: "failure", error: event.data.error },
      );
    };
    worker = created;
    return created;
  }

  return {
    compile(source, buildId) {
      return new Promise((resolve) => {
        pending.set(buildId, resolve);
        ensureWorker().postMessage({
          protocol: SCSS_WORKER_PROTOCOL,
          version: SCSS_WORKER_VERSION,
          buildId,
          source,
        });
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      pending.clear();
    },
  };
}
