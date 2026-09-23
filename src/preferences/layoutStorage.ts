import type { LayoutStorage } from "react-resizable-panels";

/**
 * `localStorage` adapter for `react-resizable-panels`' `useDefaultLayout`.
 * Merely reading `window.localStorage` throws a `SecurityError` when the
 * browser blocks site storage (e.g. cookies disabled), and `setItem` throws
 * once the quota is exhausted — passed through directly, either would crash
 * the whole shell during render. Every access is guarded instead, degrading
 * to "no persisted layout", like the other preference modules here.
 */
export const workspaceLayoutStorage: LayoutStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Best-effort: the layout simply won't survive a reload.
    }
  },
};
