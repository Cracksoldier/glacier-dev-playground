const WORKSPACE_LAYOUT_PREFERENCES_KEY = "glacier:workspace-layout-mode:v1";

/**
 * How the editors and preview share the desktop workspace: `default` puts the
 * three editors in a row above the preview, `side` puts the preview on the
 * left with the editors stacked on the right, `preview` shows only the
 * preview. Ignored on narrow layouts, which always use tabs.
 */
export type WorkspaceLayout = "default" | "side" | "preview";

const WORKSPACE_LAYOUTS: readonly WorkspaceLayout[] = [
  "default",
  "side",
  "preview",
];

export interface WorkspaceLayoutPreferences {
  layout: WorkspaceLayout;
}

export const DEFAULT_WORKSPACE_LAYOUT_PREFERENCES: WorkspaceLayoutPreferences =
  {
    layout: "default",
  };

function isWorkspaceLayout(value: unknown): value is WorkspaceLayout {
  return (
    typeof value === "string" &&
    WORKSPACE_LAYOUTS.includes(value as WorkspaceLayout)
  );
}

function isWorkspaceLayoutPreferences(
  value: unknown,
): value is WorkspaceLayoutPreferences {
  return (
    typeof value === "object" &&
    value !== null &&
    "layout" in value &&
    isWorkspaceLayout((value as { layout: unknown }).layout)
  );
}

/**
 * The chosen workspace layout, under its own key rather than as a field of
 * `layoutPreferences.ts` — `useActiveTab` saves that object wholesale and
 * would clobber a sibling field. Panel sizes are stored separately by
 * `react-resizable-panels`' `useDefaultLayout`. Never throws: any read/parse
 * failure falls back to defaults rather than blocking the shell.
 */
export function loadWorkspaceLayoutPreferences(): WorkspaceLayoutPreferences {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_LAYOUT_PREFERENCES_KEY);
    if (raw === null) return DEFAULT_WORKSPACE_LAYOUT_PREFERENCES;

    const parsed: unknown = JSON.parse(raw);
    return isWorkspaceLayoutPreferences(parsed)
      ? parsed
      : DEFAULT_WORKSPACE_LAYOUT_PREFERENCES;
  } catch {
    return DEFAULT_WORKSPACE_LAYOUT_PREFERENCES;
  }
}

export function saveWorkspaceLayoutPreferences(
  preferences: WorkspaceLayoutPreferences,
): void {
  try {
    window.localStorage.setItem(
      WORKSPACE_LAYOUT_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Best-effort: quota exceeded or storage disabled. The preference
    // simply won't survive a reload; nothing else depends on it.
  }
}
