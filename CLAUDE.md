# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Glacier DEV Playground — a browser-based code experimentation environment for HTML, CSS/SCSS, and JavaScript/TypeScript (CodePen-style). Fully client-side: no backend, no accounts, no telemetry. React 19 + TypeScript + Vite 8 SPA.

The product spec is `specification/glacier-dev-playground-specification-v2.md` (source of truth for product requirements) and `specification/glacier-dev-playground-implementation-milestones.md` (dependency-ordered milestones M0–M12 for building the app; defines implementation order and delivery gates). Read the relevant milestone section before implementing new features — it documents scope boundaries, required tests, acceptance criteria, and what's explicitly out of scope for each stage. The dependency chain is M0 → M1 → M2 → {M3, M4} → M5 → {M6, M7, M8} → M9 → M10 → M11 → M12.

## Commands

```bash
npm run dev              # Vite dev server with HMR
npm run build             # tsc -b (strict type-check) && vite build -> dist/
npm run preview           # serve the production build locally

npm run test               # Vitest unit/component tests, run once
npm run test:watch        # Vitest watch mode
npm run test:e2e           # Playwright e2e (Chromium only)

npm run check              # Biome: formatting, import order, lint
npm run check:fix         # Biome: apply automatic fixes

npm run verify:base-path  # builds under a repo-style base path and checks asset URLs
```

Run a single Vitest file: `npx vitest run src/store/projectReducer.test.ts`. Run a single Playwright spec: `npx playwright test e2e/app-shell.spec.ts`. Playwright browsers must be installed once via `npx playwright install chromium`.

Playwright's `webServer` builds against `npm run preview -- --port 4173` (baseURL `http://localhost:4173`), so `test:e2e` always exercises a production build, not the dev server.

CI (`.github/workflows/ci.yml`) runs on every PR: `check` → `test` → `build` → `verify:base-path`, then a separate e2e job. `deploy.yml` runs the same checks on push to `main` and deploys `dist/` to GitHub Pages with `VITE_BASE_PATH=/<repo-name>/`.

## Architecture

- `src/models/` — pure domain layer, no React/persistence dependencies. `project.ts` defines the versioned `PlaygroundProject` schema (`PROJECT_SCHEMA_VERSION`, bump + add a migration when the shape changes); `resource.ts`, `saveStatus.ts`, `identifiers.ts`, `projectTitle.ts` hold adjacent types/validation; `templates.ts` has pure factory functions for starter project templates (each call must produce fresh IDs/timestamps and no shared mutable nested state).
- `src/store/` — in-memory project store: `projectReducer.ts` is a plain, framework-free reducer (directly unit-testable without React), including `project/hydrate` (load persisted state, or reseed with a starter project when empty) and `project/markSaved` (advances `lastPersistedRevision`); `ProjectStoreContext.tsx` wraps it in a React context/provider exposing `useProjectStore()` (active project, project list, dirty state, `saveStatus`, `persistenceNotice`, action dispatchers), composing `useProjectHydration`/`useAutosave`/`useSaveShortcut`/`useBeforeUnloadWarning` and accepting an optional injectable `repository` prop for tests. `projectSelectors.ts` holds derived-state helpers. Deliberately reducer + context instead of a state-management library — only add one if it has a clear, documented benefit (see Agent operating rules below).
- `src/persistence/` — IndexedDB-backed project persistence, isolated from React. `projectRepository.ts` exposes `createIndexedDbProjectRepository()`/`createUnavailableProjectRepository()` implementing `load()`/`saveSnapshot()`/`resetAllData()`; `db.ts` wraps `idb`'s `openDB()` (schema in `schema.ts`, `DATABASE_VERSION` bumped only for object-store shape changes — separate from `PROJECT_SCHEMA_VERSION` in `src/models/project.ts`, which versions the stored record shape and is migrated per-record by `src/models/projectMigrations.ts#recoverProjectRecord`). Uses `idb` (not raw IndexedDB) for promise-based transactions, avoiding the "transaction auto-closes on unrelated awaited work" footgun; `db.ts`'s `blocking` callback closes a connection that's blocking a delete/upgrade — required so `saveSnapshot`'s clear-then-rewrite and test cleanup (`indexedDB.deleteDatabase`) don't hang. `debounce.ts` is a small framework-free debouncer used by `useAutosave`. Records read from storage are untyped (`unknown`) until `recoverProjectRecord` validates them — the one documented unchecked-cast boundary per the strict-mode rule below.
- `src/preferences/` — small, versioned localStorage-backed UI preferences, kept separate from `src/persistence/` project data (per spec §19.1). `shellPreferences.ts` (console visibility) never throws, falling back to defaults on any parse/shape error. Panel-size persistence instead reuses `react-resizable-panels`' own `useDefaultLayout({ storage: window.localStorage })` hook directly in `AppShell.tsx` rather than hand-rolled code.
- `src/app/` — top-level layout: `App.tsx` is a thin delegator to `AppShell.tsx`, which composes the `Toolbar`, `PersistenceNotice` (storage-unavailable/corrupt-data warnings, with a confirmed "Reset local data" action), and the resizable workspace (via `react-resizable-panels`: exports are `Group`/`Panel`/`Separator`, not the older `PanelGroup`/`PanelResizeHandle` names; `Group` takes `orientation`, not `direction`). `ProjectStoreProvider` wraps `AppShell`'s root, not `App`, because component tests render `<AppShell />` directly.
- `src/components/common/`, `.../editors/`, `.../preview/`, `.../console/` — presentational components, each with a co-located CSS module (`*.module.css`). `common/` includes hand-rolled `Dialog`/`ConfirmDialog`/`Popover` primitives (portal into the `#dialog-root` anchor in `AppShell.tsx`; no dialog/modal library is used for these two call sites) — reused by `src/components/projects/` (`NewProjectDialog`, `ResetProjectDialog`, `ProjectSwitcherPopover`, `TemplatePicker`) for project create/rename/duplicate/delete/reset flows.
- Styling: `src/styles/tokens.css` defines `--glacier-` prefixed design tokens (dark-only arctic theme; there is no light theme, includes a `--glacier-z-*` layering scale for popovers/dialogs), `fonts.css` imports narrow `@fontsource` **subset** files (e.g. `latin-500.css`, not the default `500.css`, which bundles every unicode range and bloats the build), `global.css` wires both in plus global focus-visible styling.

## Conventions and gotchas

- `tsconfig.app.json` has `verbatimModuleSyntax: true` (use `import type` for type-only imports — Biome's `organizeImports` assist enforces import ordering but not this) and `erasableSyntaxOnly: true` (no TypeScript `enum`, no parameter properties — use string-literal unions and interfaces, matching the existing domain model style).
- Strict mode is non-negotiable: no `any`, non-null assertions, suppressed diagnostics, or unchecked casts without a localized comment justifying them. Prefer throwing a descriptive `Error` over a non-null assertion when an invariant is violated (see `projectSelectors.ts#getActiveProject`).
- No path aliases are configured — use relative imports.
- Vitest runs with `globals: false` (`vite.config.ts`), so `afterEach(cleanup)` and other globals are wired explicitly in `src/test/setup.ts` rather than relying on testing-library's auto-registration. That file also stubs `ResizeObserver`, which jsdom lacks but `react-resizable-panels` requires to mount.
- jsdom has no real layout engine — `offsetWidth`/`getBoundingClientRect` are zero by default, which breaks `react-resizable-panels`' percentage-based resize math in component tests. Existing tests work around this with `vi.spyOn(HTMLElement.prototype, "offsetWidth", "get")`; real drag/keyboard resize behavior is verified in Playwright e2e instead.
- Toolbar actions that aren't wired up yet use `aria-disabled="true"` (not the native `disabled` attribute) plus `aria-describedby` pointing at a hidden "Coming in a later milestone" hint, so they stay focusable/discoverable. Follow this pattern for any still-unimplemented control rather than native `disabled` or omitting the control.
- Reducer actions are typed as a discriminated union (`ProjectStoreAction`); the `projectReducer` switch ends with a `default` branch assigning to `const exhaustiveCheck: never = action` for compile-time exhaustiveness — keep this when adding new action types.

## Agent operating rules (from the milestones spec, apply to all work)

- Implement only the current milestone's scope plus required dependency fixes — do not add future-milestone functionality, accounts, cloud storage, telemetry, collaboration features, framework-specific playground modes, asset uploads, JSX/TSX/Emmet support in user code, or a light theme. No backend/server runtime.
- Keep pure transformation logic (models, reducers, validators) outside React components — see the `src/models/` / `src/store/` split.
- Never use unsanitized `innerHTML` in the parent application.
- Add or update tests in the same change as the implementation. Remove debug code, dead code, and abandoned feature flags before finishing.
- Don't leave placeholder/non-functional controls unless the milestone explicitly calls for a disabled shell control (see the `aria-disabled` pattern above).
- Before finishing any milestone-sized change, run `npm run check`, `npm run test`, `npm run build`, and `npm run test:e2e`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
