# Architecture

Glacier DEV Playground is a single-route React 19 + TypeScript SPA built with Vite. Everything runs in the browser: there is no server component, no API, and no build step at runtime beyond the two Web Workers described below.

## Module map

| Directory | Responsibility |
| --- | --- |
| `src/models/` | Pure domain layer — no React, no persistence. The versioned `PlaygroundProject` schema, external-resource types and URL validation, resource presets and ordering, project-title validation, starter templates, the trust-gate predicate, and per-record migrations. |
| `src/store/` | In-memory project state. `projectReducer.ts` is a framework-free reducer; `ProjectStoreContext.tsx` wraps it in a React provider exposing `useProjectStore()` and composes hydration, autosave, the save shortcut, and the unload warning. `projectSelectors.ts` holds derived-state helpers. |
| `src/persistence/` | IndexedDB-backed project storage behind a `ProjectRepository` interface, isolated from React. See [storage.md](./storage.md). |
| `src/preferences/` | Small, versioned `localStorage` UI preferences, deliberately separate from project data. |
| `src/app/` | Top-level layout and shell-level hooks: `AppShell.tsx` composes the toolbar, persistence notice, and the resizable workspace; focus shortcuts, console entries, and the active-tab/narrow-layout logic live here. |
| `src/components/` | Presentational components grouped by feature (`common`, `editors`, `preview`, `console`, `projects`, `resources`, `import-export`), each with a co-located CSS module. |
| `src/preview/` | The build pipeline and the sandboxed runtime: preview document assembly, escaping, the SCSS and TypeScript compiler clients and workers, the injected console bridge, resource loading, and error-to-source mapping. |
| `src/import-export/` | Export serialization (JSON, standalone HTML, ZIP), export-time compilation, filename construction, and import validation. |
| `src/styles/` | Design tokens (`--glacier-` prefixed, dark-only), subset font imports, and global styles. |

## Build and preview data flow

1. An editor change dispatches a source update into the project store. The store marks the project dirty; autosave debounces a write to IndexedDB.
2. The preview panel debounces the change (or waits for **Run** in manual mode) and asks the build coordinator for a new execution id.
3. Stylesheet and script are compiled in parallel. CSS and JavaScript pass through untouched; SCSS goes to the SCSS worker and TypeScript *and* JavaScript go to the TypeScript worker (see the tradeoff below).
4. A blocking diagnostic aborts the build: the console reports it, the editor shows a marker, and the previous successful preview stays on screen marked stale.
5. On success, the preview document is assembled — the injected console bridge first, so it captures everything that follows, then user `<head>` content, external resources in their configured order, compiled CSS, the user's HTML, and the compiled script — and written into the sandboxed iframe.
6. The iframe reports `ready`, console output, runtime errors, unhandled rejections, and failed resources back over `postMessage`. See [protocols.md](./protocols.md).

The build coordinator stamps each run with an execution id and discards any result whose id is no longer current (`isStale`). That is what makes a fast sequence of edits promote only the final compile, and what stops a superseded run's timers and console output from reaching the UI.

## Bundle composition

Measured from `npm run build` at the M12 release gate:

| Chunk | Size | Gzip | Fetched |
| --- | --- | --- | --- |
| `index-*.js` | 854.78 kB | 281.63 kB | First paint. CodeMirror (six language/feature packages), React DOM, and the entire shell. |
| `index-*.css` | 30.45 kB | 4.92 kB | First paint. |
| Latin-subset fonts (`*.woff2` / `*.woff`) | ~10–28 kB each | — | First paint, per weight actually used. |
| `tsCompiler.worker-*.js` | 6,291.08 kB | — | First build of any project, off the main thread. Bundles the TypeScript compiler and its lib sources. |
| `scssCompiler.worker-*.js` | 3,329.10 kB | — | First build of a project whose stylesheet language is SCSS, off the main thread. |
| `ResourceManagerDialog-*.js` + `.css` | 11.49 + 7.37 kB | 3.73 + 1.36 kB | First time the Resources dialog is opened. |
| `ExportDialog-*.js` + `.css` | 9.09 + 3.82 kB | 2.97 + 0.79 kB | First time the Export dialog is opened. |
| `ImportDialog-*.js` + `.css` | 7.52 + 2.91 kB | 2.51 + 0.72 kB | First time the Import dialog is opened. |
| `resourceUrlValidation-*.js` | 0.83 kB | 0.44 kB | With whichever of the import/resources dialogs opens first. |
| `SecretsWarning-*.js` + `.css` | 0.27 + 0.39 kB | 0.20 + 0.23 kB | With whichever of the export/resources dialogs opens first. |
| `browser-*.js` (fflate) | 8.76 kB | 4.43 kB | Only on a ZIP export. |

`e2e/performance.spec.ts` asserts the deferral of the three dialog chunks by observing network requests, so a regression that re-couples them to the initial load fails the suite rather than silently growing the bundle.

### Why the TypeScript worker is fetched for JavaScript projects too

The 6.3 MB TypeScript worker loads for every project, not just TypeScript ones. `src/preview/tsCompiler.ts` is also the source of JavaScript syntax diagnostics and the enforcement point for the rule that classic mode rejects top-level `import`/`export`. Skipping it for JavaScript projects would mean losing both, which is a user-visible regression.

It is an asynchronous worker fetch off the main thread, started when the first build runs rather than during shell startup, so it does not block interactivity. Splitting the diagnostics path from the emit path is a plausible future optimization, but it is a re-architecture, not a hardening change.

### Why there is no `manualChunks` vendor split

The main chunk's weight is CodeMirror plus React DOM. Both are required for first paint, so splitting them into a vendor chunk moves bytes between files without reducing what the browser must download before the app is usable. It would improve repeat-visit caching when application code changes but dependencies do not — a real but secondary benefit that does not justify hand-maintained chunking rules here.

## Routing and hosting

The app is a single route with no client-side router, so GitHub Pages needs no `404.html` history fallback. The base path is injected at build time from `VITE_BASE_PATH` (`vite.config.ts`), defaulting to `/`, which covers both repository-style and custom-domain deployments. `npm run verify:base-path` builds under a repository-style base into a throwaway directory and asserts the generated asset URLs carry the prefix.
