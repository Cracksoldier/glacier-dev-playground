# Browser support

## Supported matrix

The latest two stable versions of:

| Browser | Engine | Automated coverage |
| --- | --- | --- |
| Google Chrome | Chromium | Full Playwright suite (14 specs). |
| Microsoft Edge | Chromium | Covered by the Chromium runs; same engine. |
| Mozilla Firefox | Gecko | `e2e/critical-journey.spec.ts` only. |
| Safari | WebKit | `e2e/critical-journey.spec.ts` only, on CI. |

## Required capabilities

`src/browserSupport.ts` blocks startup with an explanatory message when any of these is missing:

- **Web Workers** — SCSS and TypeScript compilation.
- **Sandboxed iframes** — running user code safely.
- **`crypto.randomUUID`** — project and resource identity.

Also required in practice, but not separately probed because no supported browser ships without them: ES modules, Blob URLs, `window.postMessage`, and iframe `srcdoc`.

**IndexedDB is deliberately not a hard requirement.** When it is unavailable — private-browsing modes, blocked-storage settings — the app runs the session entirely in memory and shows a persistence notice, rather than refusing to start. See [storage.md](./storage.md).

**Clipboard write is treated as best-effort.** The standalone-HTML copy action falls back to a selectable textarea whenever `navigator.clipboard.writeText` is missing or rejects.

## Cross-browser test strategy

Firefox and WebKit run exactly one spec, scoped by `testMatch` in `playwright.config.ts`. This is a deliberate limit, not an oversight: the other thirteen specs depend on Chromium-only test-harness APIs, so running them elsewhere would test the harness rather than the application.

`e2e/critical-journey.spec.ts` is written to avoid every one of those APIs, and covers the shell, editors, the worker-backed build pipeline, the sandboxed iframe, the console bridge, IndexedDB persistence across a reload, a real file download, and the parent-DOM/storage isolation guarantees.

### Documented, unavoidable differences

- **`grantPermissions(["clipboard-read", "clipboard-write"])` throws on Firefox and WebKit.** Those permission names are Chromium-specific. Every other spec grants them in `beforeEach`; the critical journey instead drives the editors with `page.keyboard.insertText`, which is safe from CodeMirror's `closeBrackets` extension for the same reason paste is — its input handler ignores inserts longer than two characters.
- **Firefox ignores the preview iframe's `allow` permission policy.** Clipboard read is still blocked there, but via the frame's opaque origin rather than the policy attribute. The assertion on the `allow` attribute therefore stays in the Chromium-only `e2e/preview.spec.ts`.
- **WebKit's first IndexedDB open after a navigation is slow** enough to make the transient "Saved" status text a race. Persistence is asserted behaviorally instead: reload, then check that content survived.
- **`file://` plus blob downloads is the least portable combination available**, particularly for WebKit on Linux. Re-opening a downloaded export over `file://` stays Chromium-only; the cross-browser journey asserts the downloaded file's *contents* instead.

### Local WebKit limitation

Playwright's WebKit build links against Ubuntu system libraries (`libicu74`, `libxml2`, `libflite1`). On a non-Debian host — including the Arch/CachyOS machine this project is developed on — the browser installs but fails to launch. WebKit coverage is therefore produced by CI (`ubuntu-latest` with `npx playwright install --with-deps`), not locally. Chromium and Firefox run locally without issue.

## Manual verification

Automation cannot substitute for these; they belong on the [release checklist](./release-checklist.md):

- Real Chrome, Edge, Firefox, and Safari on actual hardware.
- A screen-reader pass.
- A live GitHub Pages deployment check from `main`.
