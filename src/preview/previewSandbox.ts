/**
 * `sandbox` attribute for the preview iframe. Grants exactly what the
 * milestone requires (Scripts, Forms, Modal dialogs) and nothing else —
 * every unlisted sandbox token is denied by default.
 *
 * `allow-same-origin` is deliberately omitted: without it, the iframe's
 * document is forced into a unique opaque origin, so same-origin-gated APIs
 * (`document.cookie`, `localStorage`, `indexedDB.open`, reaching into
 * `window.parent.document`) fail from inside the frame. `allow-scripts`
 * combined with `allow-same-origin` is the well-known sandbox-escape
 * combination (a same-origin, scriptable frame can rewrite its own
 * sandboxing) and must never be granted together — this app grants
 * `allow-scripts` alone.
 */
export const PREVIEW_IFRAME_SANDBOX = "allow-scripts allow-forms allow-modals";

/**
 * `allow` (Permissions Policy) attribute for the preview iframe. A
 * secondary, defense-in-depth layer distinct from `sandbox`: clipboard-write
 * is permitted (still gated by the browser's own secure-context/user-gesture
 * rules), and every other sensitive feature is explicitly denied rather than
 * relying on ambiguous default-allowlist behavior.
 */
export const PREVIEW_IFRAME_ALLOW =
  "clipboard-write; clipboard-read 'none'; camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'; display-capture 'none'";

/** Extra hardening: no referrer information leaked to any resource the preview loads. */
export const PREVIEW_IFRAME_REFERRER_POLICY = "no-referrer";
