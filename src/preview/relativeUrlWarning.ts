import type { ProjectSource } from "../models/project";

const ATTRIBUTE_URL_PATTERN = /(?:src|href)\s*=\s*["']([^"']*)["']/gi;
const CSS_URL_PATTERN = /url\(\s*["']?([^"')]*)["']?\s*\)/gi;

/** Schemes/forms that are portable when the exported project is opened from a different origin. */
const PORTABLE_URL_PATTERN = /^(https:|data:|\/\/)/i;

/** Not asset references — left alone rather than flagged as non-portable. */
const NON_ASSET_URL_PATTERN = /^(#|mailto:|tel:|javascript:)/i;

function extractUrls(text: string, pattern: RegExp): string[] {
  const urls: string[] = [];
  for (const match of text.matchAll(pattern)) {
    const url = match[1]?.trim();
    if (url) urls.push(url);
  }
  return urls;
}

function isNonPortable(url: string): boolean {
  if (NON_ASSET_URL_PATTERN.test(url)) return false;
  return !PORTABLE_URL_PATTERN.test(url);
}

/**
 * Best-effort, regex-based scan (not a full HTML/CSS parser) for asset URLs
 * that won't survive being opened from a different origin — relative paths
 * and plain `http:` URLs. Used to show an advisory warning banner, not to
 * block anything.
 */
export function hasRelativeAssetUrls(source: ProjectSource): boolean {
  const urls = [
    ...extractUrls(source.html, ATTRIBUTE_URL_PATTERN),
    ...extractUrls(source.headContent, ATTRIBUTE_URL_PATTERN),
    ...extractUrls(source.stylesheet, CSS_URL_PATTERN),
  ];
  return urls.some(isNonPortable);
}
