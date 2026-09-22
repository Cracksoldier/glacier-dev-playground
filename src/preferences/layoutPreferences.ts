const LAYOUT_PREFERENCES_KEY = "glacier:layout-preferences:v1";

export type ActiveTab = "html" | "css" | "js" | "preview" | "console";

const ACTIVE_TABS: readonly ActiveTab[] = [
  "html",
  "css",
  "js",
  "preview",
  "console",
];

export interface LayoutPreferences {
  activeTab: ActiveTab;
}

export const DEFAULT_LAYOUT_PREFERENCES: LayoutPreferences = {
  activeTab: "html",
};

function isActiveTab(value: unknown): value is ActiveTab {
  return typeof value === "string" && ACTIVE_TABS.includes(value as ActiveTab);
}

function isLayoutPreferences(value: unknown): value is LayoutPreferences {
  return (
    typeof value === "object" &&
    value !== null &&
    "activeTab" in value &&
    isActiveTab((value as { activeTab: unknown }).activeTab)
  );
}

/**
 * The narrow-layout active tab, persisted separately from
 * `shellPreferences.ts` (console visibility) and panel sizes (handled by
 * `react-resizable-panels`' own `useDefaultLayout`). Never throws: any
 * read/parse failure falls back to defaults rather than blocking the shell.
 */
export function loadLayoutPreferences(): LayoutPreferences {
  try {
    const raw = window.localStorage.getItem(LAYOUT_PREFERENCES_KEY);
    if (raw === null) return DEFAULT_LAYOUT_PREFERENCES;

    const parsed: unknown = JSON.parse(raw);
    return isLayoutPreferences(parsed) ? parsed : DEFAULT_LAYOUT_PREFERENCES;
  } catch {
    return DEFAULT_LAYOUT_PREFERENCES;
  }
}

export function saveLayoutPreferences(preferences: LayoutPreferences): void {
  try {
    window.localStorage.setItem(
      LAYOUT_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Best-effort: quota exceeded or storage disabled. The preference
    // simply won't survive a reload; nothing else depends on it.
  }
}
