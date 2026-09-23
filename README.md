# Glacier DEV Playground

A browser-based code experimentation environment for HTML, CSS/SCSS, and JavaScript/TypeScript, inspired by the workflow of CodePen. Fully client-side: no backend, no accounts, no telemetry.

## Features

- Three source editors (HTML, CSS/SCSS, JavaScript/TypeScript) with a live preview, in a resizable desktop layout that collapses to tabs on narrow screens.
- SCSS and TypeScript compile in Web Workers, with errors surfaced both in the integrated console and as in-editor diagnostics.
- Classic and module execution modes, including absolute HTTPS ES-module imports where CORS permits.
- An integrated console capturing logs, runtime errors, unhandled rejections, and failed resources.
- External stylesheet/script/font resources with ordering, presets, and a trust gate for imported projects.
- Multiple local projects, autosaved to IndexedDB, restored on reload.
- Export as JSON, standalone HTML (download or clipboard), or a ZIP archive; import back from JSON.

## Requirements

- Node.js (active LTS release)
- npm

## Quick start

```bash
npm ci
npm run dev
```

Playwright's browser binaries must be installed once per machine before running end-to-end tests:

```bash
npx playwright install chromium firefox webkit
```

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot module replacement |
| `npm run build` | Strict type-check (`tsc -b`) and production build into `dist/` |
| `npm run preview` | Serve the production build locally (not a production host) |
| `npm run test` | Unit and component tests once (Vitest + React Testing Library) |
| `npm run test:watch` | The same tests in watch mode |
| `npm run test:e2e` | End-to-end tests (Playwright) against a production build |
| `npm run check` | Formatting, import order, and lint rules (Biome) |
| `npm run check:fix` | Apply Biome's automatic fixes |
| `npm run verify:base-path` | Build under a repository-style base path and verify asset URLs |

## Deployment

Pushes to `main` deploy to GitHub Pages via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml); the deployment is gated on the full check/test/build/base-path suite and the end-to-end suite. Pull requests run the same validation without deploying, via [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

The base path is supplied at build time, so both repository-style and custom-domain hosting work:

```bash
VITE_BASE_PATH=/glacier-dev-playground/ npm run build
```

When unset, the app builds for root deployment (`/`).

The deploy workflow builds for `/<repository-name>/` by default. For a custom domain or an `<owner>.github.io` repository, which are served from the root, set a repository variable `VITE_BASE_PATH` to `/` (Settings → Secrets and variables → Actions → Variables).

## Documentation

- [Architecture](./docs/architecture.md) — module map, build and preview data flow, bundle composition.
- [Protocols](./docs/protocols.md) — the worker and preview `postMessage` message contracts.
- [Storage](./docs/storage.md) — IndexedDB schema, versioning, migrations, and preference keys.
- [Security](./docs/security.md) — the sandbox model, trust gate, resource rules, and known limitations.
- [Export and import](./docs/export.md) — what each export format contains and how import validates it.
- [Browser support](./docs/browser-support.md) — supported matrix, required capabilities, known differences.
- [Acceptance criteria](./docs/acceptance-criteria.md) — evidence for every release criterion.
- [Release checklist](./docs/release-checklist.md) — the repeatable pre-release sequence.

The product specification lives in [`specification/glacier-dev-playground-specification-v2.md`](./specification/glacier-dev-playground-specification-v2.md), and the dependency-ordered build plan in [`specification/glacier-dev-playground-implementation-milestones.md`](./specification/glacier-dev-playground-implementation-milestones.md).

## License

MIT — see [LICENSE](./LICENSE).
