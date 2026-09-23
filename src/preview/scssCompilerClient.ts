import type { ScssCompileResult } from "./scssCompiler";
import {
  isScssCompileResponse,
  SCSS_WORKER_PROTOCOL,
  SCSS_WORKER_VERSION,
} from "./scssWorkerProtocol";
import type { WorkerLike } from "./workerLike";

export type { WorkerLike } from "./workerLike";

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

const WORKER_FAILED_MESSAGE =
  "The SCSS compiler stopped unexpectedly. Edit the stylesheet or press Run to retry.";

function workerFailure(): ScssCompileResult {
  return { type: "failure", error: { message: WORKER_FAILED_MESSAGE } };
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
    // A worker that failed to load (e.g. its chunk 404s after a redeploy) or
    // crashed never answers again: settle every waiting compile instead of
    // leaving builds pending forever, and let the next compile() spawn a
    // fresh worker.
    created.onerror = () => {
      created.terminate();
      if (worker === created) worker = null;
      const waiting = [...pending.values()];
      pending.clear();
      for (const resolve of waiting) resolve(workerFailure());
    };
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
        try {
          ensureWorker().postMessage({
            protocol: SCSS_WORKER_PROTOCOL,
            version: SCSS_WORKER_VERSION,
            buildId,
            source,
          });
        } catch {
          pending.delete(buildId);
          resolve(workerFailure());
        }
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      pending.clear();
    },
  };
}
