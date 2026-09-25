interface RequiredFeature {
  label: string;
  isAvailable: () => boolean;
  /** Overrides `label` when the feature is missing for a fixable reason. */
  missingLabel?: () => string | null;
}

/**
 * Browser APIs the playground genuinely cannot run without. IndexedDB is
 * deliberately not listed: missing storage degrades to an in-memory session
 * via `createUnavailableProjectRepository`, so it warns rather than blocks.
 */
const REQUIRED_FEATURES: RequiredFeature[] = [
  {
    label: "Web Workers — used to compile SCSS and TypeScript",
    isAvailable: () => typeof Worker === "function",
  },
  {
    label: "Sandboxed iframes — used to run your code safely",
    isAvailable: () => "sandbox" in document.createElement("iframe"),
  },
  {
    label: "crypto.randomUUID — used to identify projects and resources",
    isAvailable: () => typeof globalThis.crypto?.randomUUID === "function",
    // Browsers only expose randomUUID in secure contexts, so over plain
    // HTTP (e.g. a LAN IP) the browser itself is fine — the address isn't.
    missingLabel: () =>
      globalThis.isSecureContext === false
        ? "crypto.randomUUID — only available over HTTPS or on localhost; open the playground from a secure address"
        : null,
  },
];

/** Returns the missing feature descriptions, or `null` when all are present. */
export function detectUnsupportedBrowser(): string[] | null {
  const missing = REQUIRED_FEATURES.filter(
    (feature) => !feature.isAvailable(),
  ).map((feature) => feature.missingLabel?.() ?? feature.label);
  return missing.length > 0 ? missing : null;
}
