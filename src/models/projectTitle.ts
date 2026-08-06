export const PROJECT_TITLE_MAX_LENGTH = 80;
export const DEFAULT_PROJECT_TITLE = "Untitled Project";

/**
 * Normalizes a raw title into a value safe to store: trims and collapses
 * whitespace, falls back to {@link DEFAULT_PROJECT_TITLE} when empty, and
 * truncates to {@link PROJECT_TITLE_MAX_LENGTH}. Never throws, so every
 * title-setting code path can call it unconditionally.
 */
export function normalizeProjectTitle(rawTitle: string): string {
  const collapsed = rawTitle.trim().replace(/\s+/g, " ");
  const normalized = collapsed.length === 0 ? DEFAULT_PROJECT_TITLE : collapsed;
  return normalized.slice(0, PROJECT_TITLE_MAX_LENGTH);
}
