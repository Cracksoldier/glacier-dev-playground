# Acceptance criteria evidence

Every criterion from §33 of the product specification, with the file or test that demonstrates it. Criteria that automation cannot prove are marked **Manual** and appear on the [release checklist](./release-checklist.md).

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Loads from a GitHub Pages repository URL | `.github/workflows/deploy.yml`; `scripts/verify-base-path.mjs` proves the base-path build. **Manual** confirmation of the live URL. |
| 2 | Dark Glacier visual identity applied consistently | `src/styles/tokens.css` (single dark token set, no light theme); `e2e/app-shell.spec.ts` — "does not offer a light-theme toggle". **Manual** visual review. |
| 3 | HTML, CSS/SCSS, JS/TS editors visible on desktop | `e2e/responsive-tabs.spec.ts` — "shows all panels at once with no tab bar". |
| 4 | Editor panels and preview can be resized | `e2e/app-shell.spec.ts` — "resizes panels by dragging a separator". |
| 5 | Narrow screens use a functional tabbed layout | `e2e/responsive-tabs.spec.ts` — the whole "narrow layout" describe block. |
| 6 | Projects can be created, renamed, duplicated, deleted, switched | `e2e/project-management.spec.ts` — "renames, duplicates, and deletes projects through the switcher"; `src/store/projectReducer.test.ts`. |
| 7 | The last active project reopens after reload | `e2e/project-management.spec.ts` — "restores the last active project, not just the most recently created one, after reload". |
| 8 | `Ctrl/Cmd + S` forces an immediate local save | `e2e/project-management.spec.ts` — "Ctrl/Cmd+S saves immediately, without waiting for the autosave debounce". |
| 9 | HTML changes render correctly | `e2e/preview.spec.ts` — "renders HTML and CSS in the preview". |
| 10 | CSS changes render correctly | Same test. |
| 11 | SCSS compiles in a Web Worker | `src/preview/scssCompiler.worker.ts`; `e2e/scss.spec.ts` — "compiles nested SCSS with variables and updates the preview". |
| 12 | SCSS errors include useful source positions | `ScssCompileError.line`/`column`/`sourceExcerpt` in `src/preview/scssWorkerProtocol.ts`; `e2e/scss.spec.ts` — "an invalid SCSS edit reports a console error and a CodeMirror diagnostic…". |
| 13 | Compiled CSS can be viewed | `e2e/scss.spec.ts` — "the Compiled toggle shows the real, read-only compiled CSS output". |
| 14 | JavaScript executes only inside the preview iframe | `e2e/preview.spec.ts` — "executes JavaScript in the preview" and "preview code cannot reach the parent document or browser storage". |
| 15 | TypeScript gets single-file diagnostics, compiles in a Worker | `src/preview/tsCompiler.worker.ts`; `e2e/typescript.spec.ts` — "runs valid TypeScript in classic mode". |
| 16 | TypeScript errors prevent execution and display clearly | `e2e/typescript.spec.ts` — "a TypeScript type error blocks execution, reports a console diagnostic and a CodeMirror marker…". |
| 17 | Classic and module execution modes work | `e2e/typescript.spec.ts` — the classic- and module-mode tests for both JavaScript and TypeScript. |
| 18 | Absolute HTTPS ES-module imports work where CORS permits | `e2e/typescript.spec.ts` — "an absolute HTTPS import resolves and executes, reporting a non-blocking console warning". |
| 19 | Runtime logs, errors, unhandled rejections reach the console | `e2e/console.spec.ts` — the severity, thrown-error, and unhandled-rejection tests. |
| 20 | External stylesheets can be added and reordered | `e2e/resources.spec.ts` — "loads an enabled external stylesheet before the user's own stylesheet…"; `src/models/resourceOrdering.test.ts`. |
| 21 | External font stylesheets can be added | `src/models/resourcePresets.ts` — the "Google Fonts: Inter" preset; `src/models/resourcePresets.test.ts`. |
| 22 | Classic scripts load sequentially | `e2e/resources.spec.ts` — "loads classic script resources sequentially, in their configured order, before user code runs". |
| 23 | Module resources load after classic scripts | `e2e/resources.spec.ts` — "loads module resources after all classic script resources have finished, then runs user code". |
| 24 | Failed script resources block user code and show an error | `e2e/resources.spec.ts` — "a failing script resource blocks user-code execution, reports a console error, and leaves the previous successful preview visible". |
| 25 | Presets for Bootstrap, Alpine.js, Lodash, Font Awesome Free, Normalize.css, Google Fonts | `src/models/resourcePresets.ts`; `src/models/resourcePresets.test.ts`. |
| 26 | Projects autosave to IndexedDB | `src/store/useAutosave.ts`; `src/persistence/projectRepository.test.ts`; `e2e/project-management.spec.ts` — "persists a newly created project across reloads". |
| 27 | JSON export and import work | `e2e/import-export.spec.ts` — "exports a project as JSON and re-imports it as a new project, preserving its content". |
| 28 | Imported projects with external scripts require trust approval | `src/models/trustGate.ts`; `e2e/import-export.spec.ts` — "importing a project with an enabled script resource blocks auto-run until Trust and run is clicked". |
| 29 | Standalone HTML export works | `e2e/import-export.spec.ts` — "a downloaded standalone HTML export runs correctly when opened directly, with no parent-app bridge code". |
| 30 | Standalone HTML can be copied to the clipboard | `e2e/import-export.spec.ts` — "copies the standalone HTML export to the clipboard"; fallback path in `src/components/import-export/ClipboardFallbackDialog.tsx`. |
| 31 | ZIP export has runnable root files plus original sources | `src/import-export/zipFileEntries.test.ts`; `e2e/import-export.spec.ts` — "a downloaded ZIP export contains the expected root files and its index.html runs directly". |
| 32 | Manual-run and auto-run modes both work | `e2e/preview.spec.ts` — "manual run only updates the preview once Run is clicked"; auto-run is the default exercised by every other preview test. |
| 33 | The main workflow is keyboard accessible | `e2e/keyboard-workflow.spec.ts` — "the primary workflow runs from the keyboard alone", plus the `Alt+1`–`Alt+4` and toolbar-tabbing tests. |
| 34 | Panel resizing is keyboard accessible | `e2e/keyboard-workflow.spec.ts` — "panel separators resize with the arrow keys"; `e2e/app-shell.spec.ts` — "resizes panels with the keyboard". |
| 35 | Preview code can use forms and modal dialogs | `PREVIEW_IFRAME_SANDBOX` grants `allow-forms allow-modals`; `e2e/preview.spec.ts` — "forms and modal dialogs are permitted inside the preview". |
| 36 | Preview code may write to the clipboard under browser restrictions | `PREVIEW_IFRAME_ALLOW` grants `clipboard-write`. **Manual** — the actual write is gated by secure-context and user-gesture rules that differ per browser. |
| 37 | Preview code cannot read the clipboard | `PREVIEW_IFRAME_ALLOW` denies `clipboard-read`; `e2e/preview.spec.ts` — "clipboard read access is unavailable inside the preview". |
| 38 | Preview code cannot access parent DOM or parent storage | `PREVIEW_IFRAME_SANDBOX` omits `allow-same-origin`; `e2e/preview.spec.ts` and `e2e/critical-journey.spec.ts` (all three engines) — "preview code cannot reach the parent document or its storage". |
| 39 | Preview code does not receive persistent supported storage | Same opaque-origin guarantee; the storage probe in the tests above covers `localStorage` and `indexedDB`. |
| 40 | Pull requests run validation checks | `.github/workflows/ci.yml` — `check` → `test` → `build` → `verify:base-path`, plus a dependent e2e job. |
| 41 | Pushes to `main` deploy through GitHub Actions | `.github/workflows/deploy.yml`. |
| 42 | Deployed assets load correctly under a repository base path | `scripts/verify-base-path.mjs`, run in both workflows. **Manual** confirmation against the live deployment. |
| 43 | No analytics or telemetry | `package.json` has no analytics/telemetry dependency; there is no network call in the app to any origin the user did not configure. |
| 44 | Repository includes an MIT license | `LICENSE`; `"license": "MIT"` in `package.json`. |

## Summary of manual items

Criteria 1, 2, 36, and 42 have automated evidence for the mechanism but need human confirmation of the result. They are the manual section of the [release checklist](./release-checklist.md), together with the cross-browser and screen-reader passes described in [browser-support.md](./browser-support.md).
