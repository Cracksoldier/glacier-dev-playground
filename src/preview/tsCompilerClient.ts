import type { ExecutionMode, ScriptLanguage } from "../models/project";
import type { TsCompileResult } from "./tsCompiler";
import {
  isTsCompileResponse,
  TS_WORKER_PROTOCOL,
  TS_WORKER_VERSION,
} from "./tsWorkerProtocol";
import type { WorkerLike } from "./workerLike";

export interface TsCompilerClient {
  /**
   * Sends `source` to the worker tagged with `buildId`, resolving with the
   * matching response whenever it arrives — including out of order relative
   * to other concurrent `compile()` calls. Callers are responsible for
   * discarding results that are stale by the time they resolve (see
   * `PreviewFrame.tsx`'s `coordinator.isStale` recheck).
   */
  compile(
    source: string,
    scriptLanguage: ScriptLanguage,
    executionMode: ExecutionMode,
    buildId: string,
  ): Promise<TsCompileResult>;
  /** Terminates the underlying worker (if created) and drops pending requests. */
  dispose(): void;
}

const WORKER_FAILED_MESSAGE =
  "The TypeScript/JavaScript compiler stopped unexpectedly. Edit the script or press Run to retry.";

function workerFailure(): TsCompileResult {
  return {
    diagnostics: [{ message: WORKER_FAILED_MESSAGE, category: "error" }],
    emittedJs: null,
    lineMap: null,
  };
}

function defaultCreateWorker(): WorkerLike {
  return new Worker(new URL("./tsCompiler.worker.ts", import.meta.url), {
    type: "module",
  });
}

/**
 * Owns a single TS/JS compiler Worker's lifecycle. The worker is created
 * lazily on the first `compile()` call and reused for the client's lifetime
 * — spawning a fresh worker per compile would force re-paying the
 * `typescript` package's parse/load cost on every keystroke.
 */
export function createTsCompilerClient(
  createWorker: () => WorkerLike = defaultCreateWorker,
): TsCompilerClient {
  let worker: WorkerLike | null = null;
  const pending = new Map<string, (result: TsCompileResult) => void>();

  function ensureWorker(): WorkerLike {
    if (worker) return worker;
    const created = createWorker();
    // See `scssCompilerClient.ts`: a failed/crashed worker never answers
    // again, so settle every waiting compile with a blocking diagnostic and
    // let the next compile() spawn a fresh worker.
    created.onerror = () => {
      created.terminate();
      if (worker === created) worker = null;
      const waiting = [...pending.values()];
      pending.clear();
      for (const resolve of waiting) resolve(workerFailure());
    };
    created.onmessage = (event) => {
      if (!isTsCompileResponse(event.data)) return;
      const resolve = pending.get(event.data.buildId);
      if (!resolve) return;
      pending.delete(event.data.buildId);
      resolve({
        diagnostics: event.data.diagnostics,
        emittedJs: event.data.emittedJs,
        lineMap: event.data.lineMap,
      });
    };
    worker = created;
    return created;
  }

  return {
    compile(source, scriptLanguage, executionMode, buildId) {
      return new Promise((resolve) => {
        pending.set(buildId, resolve);
        try {
          ensureWorker().postMessage({
            protocol: TS_WORKER_PROTOCOL,
            version: TS_WORKER_VERSION,
            buildId,
            source,
            scriptLanguage,
            executionMode,
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
