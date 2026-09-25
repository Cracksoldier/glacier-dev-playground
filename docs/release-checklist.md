# Release checklist

Run in order. Everything above the "Manual verification" line is automated and must be green before the manual pass starts.

## 1. Automated gate

```bash
npm ci
npm run check
npm run test
npm run build
npm run verify:base-path
npm run test:e2e
```

`npm run test:e2e` serves the production build, so run it after `npm run build`. Playwright browsers must be installed once per machine:

```bash
npx playwright install --with-deps chromium firefox webkit
```

## 2. Cross-browser journey

```bash
npx playwright test --project=firefox --project=webkit
```

On Linux, WebKit only launches on a Debian-family host (macOS and Windows are fine). On other Linux distributions it installs but fails on missing system libraries — rely on the CI run instead, and say so rather than reporting it as passed. See [browser-support.md](./browser-support.md).

## 3. Bundle review

Compare the `npm run build` chunk output against the table in [architecture.md](./architecture.md). Investigate any new chunk on the first-paint path, and any significant growth in `index-*.js`. `e2e/performance.spec.ts` fails if a code-split dialog is pulled back into the initial load, but it cannot catch a dependency that simply grew.

## 4. Repository hygiene

- `package.json` — every dependency still reachable from `src/`, no analytics or telemetry package.
- `public/` — only assets the app actually references.
- `LICENSE` present and matching `package.json`'s `license` field.
- No debug code, dead code, or abandoned feature flags in the diff.

## 5. Documentation

- [architecture.md](./architecture.md)'s bundle table matches the current build.
- [acceptance-criteria.md](./acceptance-criteria.md) still points at tests that exist under the names given.
- README's script table matches `package.json`.

## 6. Deploy

Merge to `main`. `deploy.yml` runs `check` → `test` → `verify:base-path` → `build` *and* the full end-to-end suite; the deploy job needs both, so a failure in either blocks the release rather than shipping a broken build.

---

## Manual verification

These cannot be automated and must be done by a person on real hardware.

- **Live deployment** — open the GitHub Pages URL and confirm assets load under the repository base path, the app boots, and a preview runs.
- **Real browsers** — the current and previous stable versions of Chrome, Edge, Firefox, and Safari. For each: create a project, edit all three panels, confirm the preview updates, check the console, and export.
- **Clipboard export** — confirm "Copy HTML" works, and that the textarea fallback appears where the clipboard API is refused.
- **Screen reader** — one pass through the primary workflow (create project, edit, run, open a dialog, close it) with a screen reader, confirming dialogs announce their titles and that the secrets advisory reads as ordinary text rather than interrupting.
- **Reduced motion** — with the OS setting enabled, confirm transitions are disabled rather than merely shortened.
