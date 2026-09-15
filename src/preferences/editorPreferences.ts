const EDITOR_PREFERENCES_KEY = "glacier:editor-preferences:v1";

export interface EditorPreferences {
  fontSize: number;
  tabWidth: number;
  wordWrap: boolean;
  lineNumbers: boolean;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 14,
  tabWidth: 2,
  wordWrap: false,
  lineNumbers: true,
};

function isEditorPreferences(value: unknown): value is EditorPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.fontSize === "number" &&
    typeof candidate.tabWidth === "number" &&
    typeof candidate.wordWrap === "boolean" &&
    typeof candidate.lineNumbers === "boolean"
  );
}

/**
 * Small UI preferences (editor font size, tab width, word wrap, line-number
 * visibility) live in localStorage, deliberately separate from IndexedDB
 * project data — see `shellPreferences.ts` for the same pattern applied to
 * console visibility. Never throws: any read/parse failure falls back to
 * defaults rather than blocking the editors from rendering.
 */
export function loadEditorPreferences(): EditorPreferences {
  try {
    const raw = window.localStorage.getItem(EDITOR_PREFERENCES_KEY);
    if (raw === null) return DEFAULT_EDITOR_PREFERENCES;

    const parsed: unknown = JSON.parse(raw);
    return isEditorPreferences(parsed) ? parsed : DEFAULT_EDITOR_PREFERENCES;
  } catch {
    return DEFAULT_EDITOR_PREFERENCES;
  }
}

export function saveEditorPreferences(preferences: EditorPreferences): void {
  try {
    window.localStorage.setItem(
      EDITOR_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Best-effort: quota exceeded or storage disabled. The preference
    // simply won't survive a reload; nothing else depends on it.
  }
}
