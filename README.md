# Glacier DEV Playground

A browser-based code experimentation environment for HTML, CSS/SCSS, and JavaScript/TypeScript, inspired by the workflow of CodePen. Fully client-side, no backend, no accounts, no telemetry.

See [`specification/glacier-dev-playground-specification-v2.md`](./specification/glacier-dev-playground-specification-v2.md) for the full product specification and [`specification/glacier-dev-playground-implementation-milestones.md`](./specification/glacier-dev-playground-implementation-milestones.md) for the implementation plan.

## Architecture

- `src/models/` — domain types (`PlaygroundProject` and its schema, versioned from `PROJECT_SCHEMA_VERSION`), project title validation, and pure project template factories. No React or persistence dependencies.
- `src/store/` — in-memory project store: a plain reducer (`projectReducer.ts`) plus a thin React context/provider (`ProjectStoreContext.tsx`) exposing `useProjectStore()` for reading the active project and dispatching project actions (create, rename, duplicate, delete, switch, reset, source/settings updates).

## Requirements

- Node.js (active LTS release)
- npm

## Setup

```bash
npm ci
```

## Development

```bash
npm run dev
```

Starts the Vite dev server with hot module replacement.

## Testing

```bash
npm run test        # run unit and component tests once (Vitest + React Testing Library)
npm run test:watch  # run unit and component tests in watch mode
npm run test:e2e     # run end-to-end tests (Playwright)
```

Playwright's browser binaries must be installed once per machine:

```bash
npx playwright install chromium
```

## Static analysis and formatting

```bash
npm run check       # check formatting, import order, and lint rules (Biome)
npm run check:fix   # apply automatic fixes
```

## Build

```bash
npm run build
```

Type-checks the project and produces a production build in `dist/`.

```bash
npm run preview
```

Serves the production build locally for verification. This is not the production hosting server.

### Base path

The production base path can be supplied at build time for repository-style GitHub Pages deployments (e.g. `/glacier-dev-playground/`):

```bash
VITE_BASE_PATH=/glacier-dev-playground/ npm run build
```

When unset, the app builds for root deployment (`/`).

```bash
npm run verify:base-path
```

Builds the app under a repository-style base path into a throwaway directory and verifies that generated asset references use that base path.

## Deployment

Pushes to `main` deploy automatically to GitHub Pages via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Pull requests run validation only, via [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## License

MIT — see [LICENSE](./LICENSE).
