# Security model

The playground runs arbitrary user-authored code, and imported projects can carry arbitrary external script URLs. The threat model treats preview code as untrusted relative to the application shell, and treats imported project files as untrusted input.

## The preview sandbox

User code executes in an iframe with:

```
sandbox="allow-scripts allow-forms allow-modals"
allow="clipboard-write; clipboard-read 'none'; camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'; display-capture 'none'"
referrerpolicy="no-referrer"
```

`allow-same-origin` is deliberately omitted. Without it the frame's document is forced into a unique opaque origin, so every same-origin-gated API fails from inside it. `allow-scripts` together with `allow-same-origin` is the classic sandbox escape — a scriptable same-origin frame can rewrite its own `sandbox` attribute — and the two must never be granted together. This app grants `allow-scripts` alone.

The `allow` attribute is defense in depth, not the primary control: it denies sensitive features explicitly rather than relying on default-allowlist behavior.

### What preview code can do

- Run scripts, in classic or module mode.
- Use forms and modal dialogs (`alert`, `confirm`, `prompt`).
- Write to the clipboard, still subject to the browser's own secure-context and user-gesture rules.
- Fetch absolute HTTPS resources, where the remote server's CORS policy permits it.

### What preview code cannot do

- Reach `window.parent.document`, or any parent DOM.
- Read or write the parent's `localStorage`, `sessionStorage`, `indexedDB`, or cookies.
- Obtain persistent storage of its own — the opaque origin has no durable storage partition.
- Read the clipboard.
- Use camera, microphone, geolocation, fullscreen, or display capture.
- Leak a referrer to anything it loads.

These are asserted end to end in `e2e/preview.spec.ts` and, cross-browser, in `e2e/critical-journey.spec.ts`.

## Messages from the preview

The iframe's opaque origin means the parent cannot verify a message's origin, so every inbound `postMessage` is validated structurally before use — protocol, version, execution id, known type, and a fully recursive check of the payload. See [protocols.md](./protocols.md). Console arguments are serialized inside the preview into a bounded plain-data tree (depth ≤ 6, ≤ 100 entries per container, ≤ 2000 characters per string), so a cyclic or enormous logged value cannot hang the shell.

## Document assembly

The preview document is assembled as a string and written into the frame. The parent application itself never uses unsanitized `innerHTML`.

Two escaping steps guard the assembly:

- `escapeClosingSequence` breaks any `</script` or `</style` sequence in user source, so script or stylesheet content cannot prematurely close its own element and escape into markup. The inserted backslash is inert in both languages.
- `escapeHtmlAttribute` escapes values interpolated into generated attributes (resource URLs, integrity and crossorigin values).

## External resources

Resource URLs are validated before they are ever written into the document (`src/models/resourceUrlValidation.ts`):

- `https://` is accepted.
- `http://` is accepted **only** in local development, with a warning that it will be rejected as mixed content in production. In a production build it is rejected outright.
- Everything else — `javascript:`, `data:`, `file:`, `vbscript:`, and any other scheme — is rejected.
- Bare specifiers (`lodash`) and relative paths are rejected; resource URLs must be absolute.

The same validator runs on every resource in an imported file, so an import cannot smuggle in a `javascript:` URL that the manual form would have refused.

### Limitations of external resources

- **CORS is the remote server's decision.** An absolute HTTPS ES-module import or `fetch` only works if the origin serving it sends permissive CORS headers. The playground cannot proxy around this, because there is no server.
- **A failed script resource blocks user code.** If an enabled classic or module script resource fails to load, user code does not run; the console reports a `resource-error` and the last successful preview stays visible. This is deliberate — running user code against half-loaded dependencies produces confusing cascading errors.
- **Classic scripts load sequentially**, in configured order, and all of them complete before any module resource loads; user code runs last.
- **Subresource integrity is optional.** `integrity` and `crossOrigin` are passed through when set, but nothing requires them, and a CDN URL without integrity is trusted to serve what it served last time.

## The trust gate

A project has a `trusted` flag. Import always forces it to `false`, and the export format omits the field entirely — a claim of safety must never round-trip through a file.

`requiresTrustApproval` returns true when a project is untrusted *and* has at least one enabled `script` or `module` resource. In that state the preview refuses to execute and shows a banner; **Trust and run** flips the flag and runs. Stylesheet and font resources do not trip the gate, since they cannot execute.

## Imported data

Import is treated as hostile input:

- Payloads over 5 MB are rejected before parsing.
- Every field is validated individually with a specific error message — source strings, language and execution-mode enums, settings types and ranges, and each resource's id, name, URL, type, enabled flag, order, and optional integrity/crossOrigin.
- `id`, `createdAt`, `updatedAt`, `trusted`, and `schemaVersion` from the file are never used as-is; the importer mints its own.
- A rejected import leaves the active project untouched.

## Secrets

Frontend code is not a place to keep secrets, and the app says so where it matters. An inline advisory appears in the **Export** dialog (anything exported is readable by everyone it is shared with) and in the **Resources** manager (external scripts run with full access to the preview page and can read anything in it). It is a standing advisory rather than an alert, so it does not interrupt assistive technology mid-task.

## Known limitations

- **No Content-Security-Policy header.** GitHub Pages serves static files and cannot set response headers. The sandbox attribute, not CSP, is the enforcement boundary.
- **Firefox ignores the `allow` permission policy on the preview frame.** Clipboard read is still blocked there, but by the opaque origin rather than the policy. See [browser-support.md](./browser-support.md).
- **Integrity is not mandatory** for external resources, as noted above.
- **Preview code can make arbitrary outbound HTTPS requests.** A sandbox without `allow-same-origin` prevents access to *this* app's data; it does not prevent the user's own code from talking to the network.
- **The build tooling trusts the npm dependency tree.** There is no vendoring or lockfile-pinning policy beyond `npm ci` against the committed lockfile.
