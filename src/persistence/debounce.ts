export interface Debouncer<T> {
  /** Resets the pending timer and remembers `value` as the next call's argument. */
  schedule(value: T): void;
  /** Runs immediately with the last scheduled value and clears the timer, if any. */
  flush(): void;
  /** Discards any pending call without running it. */
  cancel(): void;
  /** True while a scheduled call is waiting to run. */
  isPending(): boolean;
}

export function createDebouncer<T>(
  delayMs: number,
  fn: (value: T) => void,
): Debouncer<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let pendingValue: T | undefined;

  function run() {
    timeoutId = undefined;
    const value = pendingValue as T;
    pendingValue = undefined;
    fn(value);
  }

  return {
    schedule(value: T) {
      pendingValue = value;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      timeoutId = setTimeout(run, delayMs);
    },
    flush() {
      if (timeoutId === undefined) return;
      clearTimeout(timeoutId);
      run();
    },
    cancel() {
      if (timeoutId === undefined) return;
      clearTimeout(timeoutId);
      timeoutId = undefined;
      pendingValue = undefined;
    },
    isPending() {
      return timeoutId !== undefined;
    },
  };
}
