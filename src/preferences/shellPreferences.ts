const SHELL_PREFERENCES_KEY = "glacier:shell-preferences:v1";

export interface ShellPreferences {
  consoleVisible: boolean;
}

export const DEFAULT_SHELL_PREFERENCES: ShellPreferences = {
  consoleVisible: true,
};

function isShellPreferences(value: unknown): value is ShellPreferences {
  return (
    typeof value === "object" &&
    value !== null &&
    "consoleVisible" in value &&
    typeof (value as { consoleVisible: unknown }).consoleVisible === "boolean"
  );
}

/**
 * Small UI preferences (panel visibility, not panel sizes — those are
 * handled by `react-resizable-panels`' own `useDefaultLayout`) live in
 * localStorage, deliberately separate from IndexedDB project data. Never
 * throws: any read/parse failure (corrupt value, private-mode quota) falls
 * back to defaults rather than blocking the shell from rendering.
 */
export function loadShellPreferences(): ShellPreferences {
  try {
    const raw = window.localStorage.getItem(SHELL_PREFERENCES_KEY);
    if (raw === null) return DEFAULT_SHELL_PREFERENCES;

    const parsed: unknown = JSON.parse(raw);
    return isShellPreferences(parsed) ? parsed : DEFAULT_SHELL_PREFERENCES;
  } catch {
    return DEFAULT_SHELL_PREFERENCES;
  }
}

export function saveShellPreferences(preferences: ShellPreferences): void {
  try {
    window.localStorage.setItem(
      SHELL_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Best-effort: quota exceeded or storage disabled. The preference
    // simply won't survive a reload; nothing else depends on it.
  }
}
