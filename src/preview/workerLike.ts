/**
 * The subset of the `Worker` API compiler clients depend on. Lets tests
 * inject a fake in-process transport instead of a real `Worker`, since jsdom
 * (this repo's Vitest environment) has no real Worker implementation.
 * Shared between `scssCompilerClient.ts` and `tsCompilerClient.ts`.
 */
export interface WorkerLike {
  postMessage(data: unknown): void;
  set onmessage(handler: ((event: MessageEvent) => void) | null);
  /** Fires when the worker script fails to load or throws an uncaught error. */
  set onerror(handler: ((event: ErrorEvent) => void) | null);
  terminate(): void;
}
