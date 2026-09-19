export type ResourceUrlValidationResult =
  | { valid: true; warning?: string }
  | { valid: false; reason: string };

const REJECTED_PROTOCOL_MESSAGE =
  'Only "https://" URLs are allowed (or "http://" during local development). ' +
  'Protocols like "javascript:", "data:", "file:", and "vbscript:" are not permitted.';

const BARE_OR_RELATIVE_MESSAGE =
  'This must be an absolute URL starting with "https://" — bare specifiers ' +
  '(e.g. "lodash") and relative paths are not allowed here.';

const HTTP_IN_PRODUCTION_MESSAGE =
  'Insecure "http://" URLs are only allowed during local development. ' +
  'Use an "https://" URL instead to avoid mixed-content blocking in production.';

const DEV_HTTP_WARNING =
  'This "http://" URL is only permitted in local development — it will be ' +
  "rejected as mixed content in a production build.";

/**
 * Validates a candidate external resource URL per spec §14.4/14.5. `isDev`
 * is passed in explicitly (rather than read from `import.meta.env.DEV`
 * inside this pure function) so every branch stays trivially unit-testable
 * without depending on Vite's env behavior under Vitest.
 */
export function validateResourceUrl(
  candidate: string,
  isDev: boolean,
): ResourceUrlValidationResult {
  const trimmed = candidate.trim();
  if (trimmed === "") {
    return { valid: false, reason: "A URL is required." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, reason: BARE_OR_RELATIVE_MESSAGE };
  }

  if (url.protocol === "https:") {
    return { valid: true };
  }

  if (url.protocol === "http:") {
    if (isDev) {
      return { valid: true, warning: DEV_HTTP_WARNING };
    }
    return { valid: false, reason: HTTP_IN_PRODUCTION_MESSAGE };
  }

  return { valid: false, reason: REJECTED_PROTOCOL_MESSAGE };
}
