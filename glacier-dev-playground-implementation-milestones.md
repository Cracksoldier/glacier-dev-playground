# Glacier DEV Playground

## Implementation Milestones for Coding Agents

**Version:** 1.0  
**Source specification:** `glacier-dev-playground-specification-v2.md`  
**Target release:** Glacier DEV Playground v1  
**License:** MIT  
**Deployment target:** GitHub Pages  
**Default branch:** `main`

---

## 1. Purpose

This document converts the Glacier DEV Playground v2 application specification into dependency-ordered implementation milestones suitable for execution by a coding agent.

Each milestone is intentionally bounded. A milestone should normally be implemented as one pull request. When a milestone becomes too large for a reviewable pull request, split it only at the task boundaries explicitly identified in that milestone.

The coding agent must treat the application specification as the source of truth. This document defines implementation order and delivery gates; it does not replace product requirements in the specification.

---

## 2. Agent operating rules

The coding agent shall follow these rules for every milestone.

### 2.1 Before changing code

1. Read the complete application specification.
2. Inspect the current repository state, existing conventions, and previously completed milestones.
3. Run the existing validation commands before making changes.
4. Identify whether the milestone requires a schema migration, architectural change, new dependency, or security-sensitive behavior.
5. Avoid replacing working implementations from earlier milestones unless the current milestone requires it.

### 2.2 Scope discipline

- Implement only the current milestone and required dependency fixes.
- Do not implement future enhancements from the specification.
- Do not add accounts, cloud storage, telemetry, collaboration, framework-specific playground modes, asset uploads, JSX, TSX, Emmet, or a light theme.
- Do not add a backend or server runtime.
- Do not introduce a state-management or UI framework unless it has a clear, documented benefit.
- Prefer browser APIs and small focused dependencies over large general-purpose packages.
- Commit all npm dependency changes together with the updated `package-lock.json`.

### 2.3 Code quality

- Keep TypeScript strict mode enabled.
- Avoid `any`, non-null assertions, suppressed diagnostics, and unchecked casts. Any unavoidable use must be localized and documented.
- Keep preview-runtime types separate from application UI types.
- Keep pure transformation logic outside React components.
- Do not use unsanitized `innerHTML` in the parent application.
- Add or update tests in the same milestone as the implementation.
- Remove debug code, temporary logs, dead code, and abandoned feature flags before completion.
- Do not leave placeholder buttons or non-functional controls unless the milestone explicitly calls for a disabled shell control.

### 2.4 Required verification

At the end of every milestone, run all commands currently available from this set:

```bash
npm run check
npm run test
npm run build
npm run test:e2e
```

If an end-to-end suite has not yet been introduced, state that explicitly in the pull-request summary.

### 2.5 Pull-request handoff

Every milestone handoff shall include:

- A concise implementation summary.
- Important architectural decisions.
- New dependencies and why they were added.
- Tests added or changed.
- Commands executed and whether they passed.
- Known limitations that are explicitly deferred by the milestone.
- Screenshots for visible UI changes.
- Manual verification steps for behavior that is difficult to automate.

---

## 3. Global definition of done

A milestone is complete only when:

1. All milestone acceptance criteria pass.
2. New behavior has automated coverage at the appropriate level.
3. Existing tests still pass.
4. The production build succeeds.
5. The implementation works with a configurable GitHub Pages base path.
6. No user code executes in the parent application context.
7. No telemetry or analytics have been introduced.
8. User-facing errors are actionable and do not expose unsafe raw HTML.
9. Public APIs, storage formats, and worker message formats are typed and documented.
10. Documentation is updated when commands, architecture, or user behavior changes.

---

## 4. Milestone dependency map

```text
M0  Repository foundation and delivery pipeline
 └─ M1  Glacier design system and application shell
     └─ M2  Domain model, project store, and templates
         ├─ M3  IndexedDB persistence and project management
         └─ M4  CodeMirror editor subsystem
             └─ M5  Secure preview runtime and build coordinator
                 ├─ M6  Console bridge and runtime diagnostics
                 ├─ M7  SCSS compilation worker
                 └─ M8  TypeScript compilation worker
                     └─ M9  External resources and trusted execution
                         └─ M10 Import and export
                             └─ M11 Responsive UX and accessibility completion
                                 └─ M12 Security, performance, compatibility, and release
```

M3 and M4 may be developed in parallel after M2 if separate branches do not modify the same application-store interfaces.

---

# Milestone 0 — Repository Foundation and Delivery Pipeline

## Goal

Create a reproducible React and TypeScript project with quality gates, test infrastructure, and GitHub Pages deployment before feature development begins.

## Dependencies

None.

## Deliverables

### Project bootstrap

- Create a Vite React TypeScript application.
- Use npm and commit `package-lock.json`.
- Enable strict TypeScript configuration.
- Define a clear source structure aligned with the specification.
- Add an MIT `LICENSE` file.
- Add a concise `README.md` with setup, development, test, build, and deployment commands.

### Static analysis and formatting

- Configure Biome for application code, tests, and configuration files where supported.
- Add scripts equivalent to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "biome check .",
    "check:fix": "biome check --write ."
  }
}
```

### Test infrastructure

- Configure Vitest.
- Configure React Testing Library and DOM matchers.
- Configure Playwright with at least Chromium for the initial smoke test.
- Add one unit or component smoke test.
- Add one end-to-end smoke test that loads the application shell.

### Base-path support

- Configure Vite so the production base path can be supplied at build time.
- Ensure application code does not hard-code root-relative asset paths.
- Add a test or scripted verification for a repository-style base path such as `/glacier-dev-playground/`.

### GitHub Actions

Create a pull-request validation workflow that runs:

```bash
npm ci
npm run check
npm run test
npm run build
```

Create `.github/workflows/deploy.yml` that:

- Runs on pushes to `main` and manual dispatch.
- Uses an active Node.js LTS release.
- Uses `npm ci`.
- Runs checks and tests before building.
- Uploads `dist` as the GitHub Pages artifact.
- Deploys through the `github-pages` environment.
- Uses `contents: read`, `pages: write`, and `id-token: write` permissions.
- Cancels an older in-progress deployment when a newer deployment starts.

## Required tests

- Application smoke test.
- Production build test.
- Base-path asset-loading test.
- Workflow syntax validation where practical.

## Acceptance criteria

- A clean checkout can run `npm ci`, `npm run check`, `npm run test`, and `npm run build` successfully.
- `npm run dev` displays the application shell.
- `npm run preview` serves the built application.
- The build works with both `/` and a repository subpath.
- Pull requests validate but do not deploy.
- Pushes to `main` are configured to deploy to GitHub Pages.
- The repository contains the MIT license.

## Explicitly out of scope

- Functional editors.
- Project persistence.
- Preview execution.
- Final Glacier styling.

## Suggested pull-request title

`chore: bootstrap Glacier DEV Playground and delivery pipeline`

---

# Milestone 1 — Glacier Design System and Application Shell

## Goal

Implement the dark Glacier visual foundation and the structural application layout without adding editor or preview behavior.

## Dependencies

M0.

## Deliverables

### Branding and design tokens

- Adapt the Glacier snowflake mark and wordmark treatment from the approved Glacier reference project.
- Display `GLACIER` as the primary wordmark and `DEV PLAYGROUND` as the subtitle.
- Add a playground-specific favicon derived from the Glacier snowflake.
- Define CSS custom properties for:
  - Arctic navy backgrounds.
  - Frosted panel surfaces.
  - Cyan primary accent.
  - Violet and mint secondary accents.
  - Text, muted text, borders, focus rings, warnings, and errors.
- Configure the approved font roles:
  - Chakra Petch for branding and display text.
  - IBM Plex Sans for interface text.
  - JetBrains Mono for code-related UI.
- Provide resilient fallback fonts when web fonts cannot load.

### Application regions

Create semantic structural regions for:

- Header and toolbar.
- Three editor panels.
- Preview panel.
- Console panel.
- Dialog portal or overlay root.

### Toolbar shell

Add visible controls for:

- Project switcher.
- New project.
- Run.
- Auto-run.
- Save status.
- Resources.
- Project settings.
- Import.
- Export.
- Reset.

Controls that depend on later milestones may be disabled, but must have accessible names and an explanatory disabled state.

### Resizable layout foundation

- Implement the desktop three-column editor region.
- Implement the vertical split between editor and preview regions.
- Reserve space for the collapsible console.
- Store split values in component state for now.
- Provide mouse and keyboard-operable split handles.
- Establish sensible minimum panel dimensions.

## Required tests

- Application shell renders all major landmarks.
- Toolbar controls have accessible names.
- Split handles can be focused and adjusted by keyboard.
- Dark design tokens are present and applied.
- No light-theme selector is present.

## Acceptance criteria

- The UI visibly belongs to the Glacier design family without copying CodePen branding.
- Desktop layout shows three editor placeholders above the preview.
- Horizontal and vertical resizing works.
- Resize handles expose appropriate separator semantics and values.
- Keyboard focus is clearly visible.
- The interface remains usable without downloaded web fonts.

## Explicitly out of scope

- Mobile tab behavior.
- CodeMirror.
- Functional project actions.
- Preview execution.
- Final accessibility audit.

## Suggested pull-request title

`feat: add Glacier design system and application shell`

---

# Milestone 2 — Domain Model, Project Store, and Templates

## Goal

Define stable application contracts and implement project behavior in memory before persistence and editor integrations depend on them.

## Dependencies

M1.

## Deliverables

### Domain contracts

Define typed models for:

- `PlaygroundProject`.
- Project source configuration.
- Stylesheet language: CSS or SCSS.
- Script language: JavaScript or TypeScript.
- Execution mode: classic or module.
- External resources.
- Project settings.
- Save status.
- Compilation and execution identifiers.

Start with an explicit project schema version, normally `1`.

### Project factory and templates

Implement pure factories for:

- Empty project.
- Basic HTML example.
- SCSS example.
- JavaScript interaction example.
- TypeScript example.

Factories must generate new project IDs and timestamps without sharing mutable source objects.

### In-memory project store

Implement:

- Project list.
- Active-project selection.
- Create.
- Rename.
- Duplicate.
- Delete.
- Switch.
- Reset from template.
- Source and settings updates.
- Dirty-state and revision tracking.

Use React context and reducer-style state or another small, well-justified approach. Do not add a large state-management framework by default.

### Mutation guarantees

- Project updates must be immutable.
- Duplicate must create a new ID and timestamps.
- Deleting the active project must select another project or create a starter project.
- Project titles must have a non-empty normalized value and a reasonable length limit.
- Resource order must remain deterministic.

## Required tests

Unit tests for:

- Every template factory.
- Create, rename, duplicate, delete, switch, and reset operations.
- Active-project fallback after deletion.
- Immutability of updates.
- Default settings.
- Project-title validation.

Component tests for basic project-store integration with the toolbar shell.

## Acceptance criteria

- The application creates a starter project in memory.
- All required project operations work without persistence.
- Project IDs are unique.
- Duplicate projects do not share mutable nested state.
- Deleting the final project creates or retains a usable starter project.
- The project schema is exported from a stable module and documented.

## Explicitly out of scope

- IndexedDB.
- Autosave.
- JSON import and export.
- External-resource UI.

## Suggested pull-request title

`feat: add project domain model, store, and templates`

---

# Milestone 3 — IndexedDB Persistence and Project Management

## Goal

Persist multiple projects reliably and expose complete local project-management workflows.

## Dependencies

M2.

## Deliverables

### Persistence repository

Implement an IndexedDB repository for:

- Projects.
- Project metadata.
- Active-project ID.
- Storage schema version.

The repository shall expose typed operations and isolate IndexedDB details from React components.

A small IndexedDB wrapper dependency may be used if it materially improves transaction safety and migration handling. Document the choice.

### Schema migration and recovery

- Add explicit migrations between known versions.
- Reject unsupported future versions.
- Recover from invalid or unreadable persisted data without preventing application startup.
- Offer a safe reset or recovery action that does not silently delete valid projects.

### Autosave

- Debounce project saves.
- Expose `Saving`, `Saved`, `Save failed`, and `Storage unavailable` states.
- Make `Ctrl/Cmd + S` force an immediate save and prevent the browser Save Page action.
- Warn on `beforeunload` only while a save is pending or the latest save failed.
- Do not show leave-page warnings after a successful save.

### Project management UI

Implement accessible user flows for:

- Create from a template.
- Rename.
- Duplicate.
- Delete with confirmation.
- Switch project.
- Reset from a template with confirmation.

Restore the last active project after reload.

### Preference persistence foundation

Persist small UI preferences separately from project data, including available shell settings such as panel sizes and console visibility.

## Required tests

Unit tests for:

- Repository create, read, update, delete, and list operations.
- Active-project restoration.
- Schema migration.
- Corrupt-data recovery.
- Autosave debounce and immediate save.
- Save-state transitions.

Component or end-to-end tests for:

- Multiple projects surviving reload.
- Project switching.
- Rename, duplicate, and delete.
- Last active project restoration.
- Conditional leave-page warning logic.

## Acceptance criteria

- Multiple projects persist across reloads.
- The last active project reopens.
- Save status accurately reflects repository operations.
- `Ctrl/Cmd + S` performs an immediate local save.
- Storage failure leaves the editor usable and displays a warning.
- Destructive project actions require confirmation.
- Known schema versions migrate explicitly.

## Explicitly out of scope

- Importing external JSON files.
- Exporting projects.
- Cloud synchronization.
- Project folders or tags.

## Suggested pull-request title

`feat: persist and manage local playground projects`

---

# Milestone 4 — CodeMirror Editor Subsystem

## Goal

Replace editor placeholders with stable CodeMirror 6 instances and connect them to active-project state.

## Dependencies

M2. M3 should preferably be complete before final integration.

## Deliverables

### Editor integration

Add three CodeMirror editors:

- HTML.
- CSS or SCSS.
- JavaScript or TypeScript.

Provide:

- Syntax highlighting.
- Line numbers.
- Search and replace.
- Undo and redo.
- Bracket matching.
- Automatic indentation.
- Keyboard indentation.
- HTML closing-tag assistance.
- Basic language-aware completion where CodeMirror provides it without a new language service.

### Language controls

- CSS/SCSS selector.
- JavaScript/TypeScript selector.
- Classic/ES-module selector.
- Store all choices per project.
- Reject or clearly flag `import` and `export` syntax in classic mode once diagnostics are available.

### Editor state stability

- Do not recreate editor instances on ordinary source updates.
- Preserve selection and scroll state while switching responsive views.
- Ensure switching projects loads the correct source without polluting undo history between projects.
- Avoid feedback loops between CodeMirror transactions and project-store updates.

### Preferences

Implement and persist:

- Font size.
- Tab width.
- Word wrapping.
- Line-number visibility.

### Focus and shortcuts

Implement:

- `Alt + 1`: HTML.
- `Alt + 2`: CSS/SCSS.
- `Alt + 3`: JavaScript/TypeScript.
- Standard editor search and undo shortcuts.

Reserve a diagnostics API that later workers can use to add editor markers and focus source positions.

## Required tests

Component tests for:

- Source changes updating the active project.
- Language selections persisting per project.
- Project switching loading correct content.
- Editor preferences.
- Focus shortcuts.
- No source change triggered merely by mounting an editor.

Manual verification for CodeMirror undo history and selection behavior.

## Acceptance criteria

- All three editors are functional.
- Editing updates the active project and autosave path.
- Switching projects does not leak content or undo history.
- Editor instances remain stable during ordinary application updates.
- Language and execution selections persist.
- Editor preferences are applied consistently.

## Explicitly out of scope

- SCSS compilation.
- TypeScript type checking.
- Preview rendering.
- Emmet, Vim, Emacs, JSX, and TSX.

## Suggested pull-request title

`feat: integrate CodeMirror source editors`

---

# Milestone 5 — Secure Preview Runtime and Build Coordinator

## Goal

Render HTML, CSS, and JavaScript safely in a sandboxed iframe with deterministic auto-run and manual-run behavior.

## Dependencies

M4.

## Architectural requirement: candidate preview promotion

The application must keep the last successful preview visible when a later build fails. Implement preview runs using a candidate-and-promotion model:

1. Keep the current successful preview visible.
2. Build and execute the next run in a separate candidate iframe or equivalent isolated candidate context.
3. Promote the candidate only after required compile and resource stages report success.
4. Discard failed or stale candidates without replacing the visible preview.

This architecture is required before external resource loading is added in M9.

## Deliverables

### Build coordinator

Implement a typed build pipeline that:

1. Captures an immutable project snapshot.
2. Assigns a build ID and execution ID.
3. Validates supported source modes.
4. Produces raw CSS and JavaScript for the initial implementation.
5. Builds the preview document.
6. Starts a candidate preview.
7. Ignores stale builds and stale messages.
8. Promotes the successful candidate.

### Preview document builder

Generate:

- Doctype.
- HTML shell.
- Character encoding.
- Viewport metadata.
- User head content.
- User CSS.
- User HTML body content.
- Preview bridge bootstrap point.
- User JavaScript.

Safely handle user source containing closing `</script>` and `</style>` sequences.

### Sandboxed iframe

Configure the most restrictive sandbox and Permissions Policy that supports:

- Scripts.
- Forms.
- Modal dialogs.
- Clipboard write when browser policy and a user gesture permit it.

Do not grant:

- `allow-same-origin` by default.
- Clipboard read.
- Downloads.
- Popups.
- Camera or microphone.
- Geolocation.
- Fullscreen.
- Pointer lock.

User code must not access the parent DOM, local storage, IndexedDB, application state, or cookies.

### Run behavior

- Implement Run.
- Implement auto-run.
- Use a configurable debounce with a default between 300 and 500 ms.
- When auto-run is disabled, changes must not affect the preview until Run is selected.
- Replacing or discarding a candidate must terminate its timers and DOM execution context.
- Expand-preview and in-application full-window preview modes may be introduced here or in M11.

### Relative URL warning

Warn users that relative asset URLs are not portable and recommend absolute HTTPS, CDN, or data URLs. Do not implement asset uploading.

## Required tests

Unit tests for:

- Preview document generation.
- Script and style closing-sequence escaping.
- Execution-ID generation and stale-run rejection.
- Auto-run debounce.

End-to-end tests for:

- HTML rendering.
- CSS rendering.
- JavaScript execution.
- Manual-run behavior.
- Old intervals or timers stopping after a new run.
- Preview code failing to access the parent DOM and storage.
- Forms and modal dialogs being permitted.
- Clipboard read being unavailable.

## Acceptance criteria

- HTML, CSS, and JavaScript render in an isolated preview.
- User code never executes in the parent application.
- Every run uses a fresh execution context.
- Stale runs cannot replace newer results.
- Manual and automatic run modes work.
- The preview sandbox passes the required security tests.
- The preview builder safely handles embedded closing tags.
- A failed candidate does not destroy the last successful preview.

## Explicitly out of scope

- Console rendering.
- SCSS and TypeScript compilation.
- External resources.
- New-window preview.

## Suggested pull-request title

`feat: add secure staged preview runtime`

---

# Milestone 6 — Console Bridge and Runtime Diagnostics

## Goal

Capture preview logs and runtime failures through a validated messaging protocol and display them in an integrated console.

## Dependencies

M5.

## Deliverables

### Messaging protocol

Define a versioned protocol equivalent to:

```ts
interface PreviewMessage<T = unknown> {
  protocol: "glacier-dev-playground-preview";
  version: 1;
  executionId: string;
  type:
    | "ready"
    | "console"
    | "runtime-error"
    | "unhandled-rejection"
    | "resource-error";
  payload: T;
}
```

Validate:

- Event source.
- Protocol name.
- Protocol version.
- Execution ID.
- Message type.
- Payload shape.

Ignore unknown, malformed, or stale messages.

### Console interception

Capture inside the preview:

- `console.log`.
- `console.info`.
- `console.warn`.
- `console.error`.
- `console.debug`.
- `console.clear`.
- Runtime errors.
- Syntax errors that occur during candidate execution.
- Unhandled promise rejections.

### Safe serialization

Implement bounded serialization for:

- Primitives.
- Arrays.
- Plain objects.
- Errors.
- DOM nodes represented safely.
- Circular references.
- Functions and unsupported browser objects.

Apply depth and size limits so logging an enormous or hostile object cannot freeze the parent application.

### Console UI

Display:

- Severity.
- Relative timestamp.
- Message.
- Expandable serialized values.
- Source location when available.

Implement:

- Clear action.
- Preserve Logs project setting.
- Default log clearing on each new run.
- Error badges on relevant panels.
- Click-to-focus nearest source position when mapping is available.

Use generated line offsets or source URL markers for approximate JavaScript mapping. Full source maps are not required.

## Required tests

Unit tests for:

- Message validation.
- Stale-message rejection.
- Serializer behavior, circular references, and limits.
- Console state and preserve-logs behavior.

End-to-end tests for:

- Every supported console method.
- Runtime errors.
- Unhandled promise rejections.
- Clearing logs.
- Old execution messages being ignored.

## Acceptance criteria

- Preview logs appear in the parent console without executing user-controlled markup.
- Circular values do not break logging.
- Runtime errors and unhandled rejections are visible.
- Preserve Logs works per project.
- Malformed or stale messages cannot affect application state.
- Selecting a mapped error focuses the nearest relevant editor line.

## Explicitly out of scope

- Interactive console input.
- Network request inspection.
- Full source-map generation.

## Suggested pull-request title

`feat: add validated preview console and diagnostics`

---

# Milestone 7 — SCSS Compilation Worker

## Goal

Compile single-file SCSS in the browser without blocking editing and integrate compiler diagnostics into the staged preview pipeline.

## Dependencies

M5 and M6.

## Deliverables

### Worker protocol

Create typed request and response contracts containing:

- Build ID.
- Source text.
- Compiler options required by the application.
- Success result with compiled CSS.
- Structured failure result with message, line, column, and source excerpt where available.

### Dart Sass integration

- Run Dart Sass in a Web Worker.
- Lazy-load the compiler where practical.
- Support one source file.
- Support variables, nesting, mixins, functions, and available Sass built-in modules.
- Do not implement filesystem imports, project-relative files, remote imports, or virtual multi-file resolution.

### Build integration

- Compile SCSS only for SCSS projects.
- Compile after the auto-run debounce or when Run is selected.
- Discard stale worker results.
- Prevent candidate preview execution on compilation failure.
- Keep the last successful visible preview.
- Mark the visible preview as stale when current source failed to compile.

### Diagnostics and compiled output

- Add CodeMirror diagnostics.
- Focus the correct source location when a diagnostic is selected.
- Add a read-only Compiled CSS view.
- Keep the most recent successful compiled CSS associated with the matching project revision.

## Required tests

Unit tests for:

- Successful compilation.
- Structured syntax errors.
- Stale worker responses.
- CSS mode bypassing Sass.
- Unsupported import behavior.
- Project revision and compiled-output association.

End-to-end tests for:

- Valid SCSS updating the preview.
- Invalid SCSS showing diagnostics.
- Invalid SCSS keeping the last successful preview.
- Compiled CSS view.
- Rapid edits promoting only the latest result.

## Acceptance criteria

- SCSS compilation occurs outside the main thread.
- Editing remains responsive while compiling.
- Compiler errors include useful source positions.
- Failed SCSS never executes user JavaScript for that build.
- The last successful preview remains visible and is marked stale.
- The compiled CSS view displays the output for the current successful revision.

## Explicitly out of scope

- Multiple SCSS files.
- Remote imports.
- Source maps beyond diagnostic positions.

## Suggested pull-request title

`feat: compile SCSS in a Web Worker`

---

# Milestone 8 — TypeScript Compilation Worker and Execution Modes

## Goal

Provide full single-file TypeScript diagnostics and transpilation while supporting classic and ES-module execution modes.

## Dependencies

M5, M6, and M7 build-coordinator interfaces.

## Deliverables

### Worker compiler service

Use the TypeScript compiler API in a Web Worker to provide:

- Single-file syntactic diagnostics.
- Single-file semantic diagnostics.
- DOM, DOM iterable, and modern ECMAScript standard library types.
- JavaScript emit.
- Structured diagnostic positions and messages.
- Stale-result protection.

Use a modern browser output target appropriate for the supported browser policy. Document the chosen target and libraries.

### Execution-mode behavior

Support:

- JavaScript + classic.
- JavaScript + ES module.
- TypeScript + classic.
- TypeScript + ES module.

Classic mode shall reject top-level `import` and `export` syntax.

Module mode shall preserve or emit ES-module syntax suitable for browser execution.

### Absolute HTTPS imports

Permit absolute HTTPS module imports in production.

Because remote declarations are not downloaded, missing type information for an otherwise valid absolute HTTPS module import must not make the feature unusable. Implement and document one consistent policy:

- Report unavailable remote typings as a non-blocking warning, and allow browser execution; or
- Provide a narrowly scoped generated ambient declaration for the imported URL and mark imported values as untyped.

Do not resolve bare package names or relative imports. Those must produce actionable blocking diagnostics.

Any internal use of `any` required for an untyped remote module must be isolated to generated compiler declarations and documented as an interoperability boundary.

### Build integration

- Type-check and transpile before creating the candidate preview.
- Do not execute user code when blocking TypeScript diagnostics exist.
- Keep and mark the last successful preview as stale after failure.
- Make diagnostics selectable in CodeMirror.
- Preserve absolute HTTPS imports in module output.

### JavaScript validation

For JavaScript projects:

- Detect invalid classic/module syntax sufficiently to prevent obvious execution-mode mismatches.
- Continue to report runtime syntax errors through the preview bridge when they cannot be caught earlier.

## Required tests

Unit tests for:

- Successful TypeScript compilation.
- DOM typing.
- Semantic and syntactic diagnostics.
- Classic-mode import rejection.
- Module-mode output.
- Absolute HTTPS import policy.
- Bare and relative import rejection.
- Stale worker responses.

End-to-end tests for:

- TypeScript execution.
- Type errors preventing execution.
- Classic and module JavaScript.
- Classic and module TypeScript.
- Absolute HTTPS imports where the test environment permits CORS.
- Last successful preview preservation after compile failure.

## Acceptance criteria

- Type checking and transpilation run in a worker.
- Blocking diagnostics prevent candidate execution.
- Diagnostics link to editor locations.
- All four language/execution combinations work.
- Absolute HTTPS imports are usable without automatic declaration downloads.
- Bare and relative imports fail with clear guidance.
- No JSX or TSX support is introduced.

## Explicitly out of scope

- Multiple TypeScript files.
- Editable `tsconfig.json`.
- Third-party declaration downloads.
- Babel, JSX, and TSX.

## Suggested pull-request title

`feat: add TypeScript diagnostics and module execution`

---

# Milestone 9 — External Resources and Trusted Execution

## Goal

Allow users to configure browser-compatible external resources while preserving deterministic loading, staged preview promotion, and safe handling of imported scripts.

## Dependencies

M5, M6, and M8.

## Deliverables

### Resource manager UI

Implement create, edit, enable, disable, reorder, and delete flows for:

- Stylesheets.
- Font stylesheets.
- Classic scripts.
- JavaScript modules.

Fields:

- ID.
- Display name.
- URL.
- Type.
- Enabled state.
- Order.
- Optional integrity value.
- Optional `crossorigin` value.

### URL validation

Production:

- Accept HTTPS.
- Reject HTTP with a mixed-content explanation.

Local development:

- Permit HTTP where configured.

Always reject resource entries using:

- `javascript:`.
- `data:`.
- `file:`.
- `vbscript:`.
- Bare package names.
- Relative URLs.

### Deterministic candidate loading

Within the candidate preview:

1. Add stylesheet and font links before user CSS.
2. Load classic scripts sequentially in configured order.
3. Load module resources after classic scripts.
4. Execute user JavaScript or compiled TypeScript only after every enabled script resource succeeds.
5. Report resource name and URL on failure.
6. On a script-resource failure, reject the candidate and retain the visible successful preview.

Stylesheet completion does not block user-code execution, but load failures should still be reported when detectable.

Avoid exposing arbitrary `async` and `defer` settings.

### Presets and helpers

Add versioned preset definitions or URL helpers for:

- Bootstrap CSS and JavaScript.
- Alpine.js.
- Lodash.
- Font Awesome Free.
- Normalize.css.
- Google Fonts.

Preset application must create ordinary editable resource entries. Do not hard-code hidden dependencies.

### Head content

Expose the project Head content field in an advanced settings section. Clearly distinguish it from structured resources.

### Imported-script trust state

Prepare a local trust marker that can be set by import in M10:

- Trust is local metadata, not proof that a project is safe.
- Imported projects containing enabled script or module resources must not auto-run until the user explicitly approves them.
- Trust state must not be exported as a guarantee to another user.

## Required tests

Unit tests for:

- URL protocol validation.
- Production and development HTTP rules.
- Resource ordering.
- Preset generation.
- Resource document generation.
- Trust-state rules.

Component tests for resource CRUD, ordering, validation messages, and presets.

End-to-end tests for:

- External CSS loading before user CSS.
- Classic scripts loading sequentially.
- Module resources loading after classic scripts.
- User code waiting for script resources.
- Failed script resources preventing user-code execution.
- Failed candidates retaining the previous preview.

Use local deterministic test resources rather than depending on public CDNs in the normal CI suite.

## Acceptance criteria

- Users can manage all required resource types.
- Invalid and insecure URLs are rejected with actionable errors.
- Script loading order is deterministic.
- User code never runs after a required script dependency fails.
- Resource failures appear in the integrated console.
- All required presets or helpers are present.
- Head content is editable.
- Imported-script trust blocking is available for M10 integration.

## Explicitly out of scope

- npm search.
- Automatic package resolution.
- Downloading resource contents for offline use.
- React or Vue presets.

## Suggested pull-request title

`feat: add external resources and trusted preview loading`

---

# Milestone 10 — Import and Export

## Goal

Make projects portable through validated JSON, standalone HTML, clipboard, and ZIP workflows.

## Dependencies

M3, M8, and M9.

## Deliverables

### JSON export

Export a versioned project document containing:

- Schema version.
- Project metadata.
- All source code.
- Language and execution selections.
- Resource URLs and metadata.
- Project settings.

Do not embed external resource content.

### JSON import

Treat imported files as untrusted input.

- Enforce a 5 MB initial size limit.
- Validate the complete schema.
- Reject unsupported future versions.
- Migrate supported older versions explicitly.
- Preserve the current project if validation fails.
- Require confirmation before replacing or adding conflicting project data.
- Normalize generated local IDs as needed.
- Never import a positive trust state from the file.
- If enabled script or module resources are present, block auto-run and display a trust warning before first execution.

### Standalone HTML export

Generate a browser-runnable HTML file containing:

- External resource references.
- Compiled CSS when SCSS is selected.
- User body HTML.
- Compiled JavaScript when TypeScript is selected.
- Classic or module script behavior matching the project.

The export may require network access for remote resources.

Do not include parent-application console bridge code unless it is deliberately adapted into harmless standalone behavior.

### Copy to clipboard

Copy the same standalone HTML content from the parent application using clipboard write. Provide a fallback error or manual-copy dialog when the API is unavailable.

### ZIP export

Generate:

```text
index.html
style.css
script.js
```

When relevant, also include:

```text
src/style.scss
src/script.ts
```

Requirements:

- Root files run directly without a build step.
- `index.html` references root CSS and JavaScript correctly.
- Original editable source is preserved only when SCSS or TypeScript is active.
- External resources remain URLs.
- Filenames are stable and safely generated.

Lazy-load ZIP generation where practical.

## Required tests

Unit tests for:

- JSON serialization.
- Import schema validation.
- File-size rejection.
- Unsupported-version rejection.
- Trust-state reset.
- Standalone HTML generation for all four script combinations.
- SCSS and TypeScript compiled-output export.
- ZIP file listing and content references.
- Export escaping.

End-to-end tests for:

- JSON export/import round trip.
- Invalid import preserving current work.
- Imported script trust warning.
- Standalone HTML running independently.
- Clipboard export where supported.
- ZIP containing runnable root files and optional source files.

## Acceptance criteria

- JSON round trips preserve project behavior.
- Invalid imports cannot corrupt the active project.
- Imported external scripts never auto-run before approval.
- Standalone HTML runs in a browser.
- Clipboard export copies the standalone document or reports an actionable fallback.
- ZIP exports have the required structure and runnable root files.
- SCSS and TypeScript originals are included only when relevant.

## Explicitly out of scope

- Offline embedding of remote dependencies.
- CodePen-specific export formats.
- Cloud sharing.

## Suggested pull-request title

`feat: add secure project import and portable exports`

---

# Milestone 11 — Responsive UX and Accessibility Completion

## Goal

Complete the user-facing experience across desktop, tablet, and narrow screens and meet the specified accessibility target for the application interface.

## Dependencies

M1 through M10.

## Deliverables

### Responsive editor workflow

On narrow screens, provide tabs for:

- HTML.
- CSS/SCSS.
- JavaScript/TypeScript.
- Preview.
- Console.

Requirements:

- Switching tabs does not destroy CodeMirror instances or editor state.
- The active tab persists as an interface preference.
- Preview and console remain usable on small screens.
- Mobile support is functional, not optimized for extended coding sessions.

### Dialog completion

Ensure all project, resource, settings, import, export, confirmation, and keyboard-help dialogs provide:

- Focus trapping.
- Escape-to-close where safe.
- Focus restoration.
- Accessible titles and descriptions.
- Correct destructive-action emphasis.

### Keyboard workflow

Complete:

- `Ctrl/Cmd + Enter`: Run.
- `Ctrl/Cmd + S`: Save.
- `Alt + 1` through `Alt + 4`: Focus editor or preview.
- `Escape`: Close active dialog.
- Keyboard-accessible split resizing.
- Keyboard-shortcuts help dialog.

### Accessibility

Target WCAG 2.2 AA for the parent application:

- Accessible control names.
- Programmatic editor panel headings.
- Statuses not conveyed by color alone.
- Screen-reader announcements for compile, runtime, storage, import, and resource failures.
- Visible focus.
- Sufficient contrast.
- Reduced-motion support.
- Usability at 200% zoom.
- Logical landmarks and heading order.

User-generated preview content is excluded from the parent application's conformance target.

### Preview presentation

- Add expand-preview mode.
- Add full-window preview within the application.
- Do not add new-window preview.

### Unsupported-browser handling

Detect critical missing APIs and show a clear unsupported-browser message or degraded-mode explanation.

## Required tests

Component tests for:

- Dialog focus behavior.
- Keyboard shortcuts.
- Tab persistence.
- Screen-reader status regions.
- Reduced-motion behavior where practical.

End-to-end tests for:

- Keyboard-only primary workflow.
- Responsive tabs.
- Editor state surviving tab switches.
- 200% zoom smoke behavior.
- Expand and in-application full-window preview.

Run an automated accessibility scanner as a supporting check, but do not treat it as a substitute for manual keyboard and screen-reader-oriented review.

## Acceptance criteria

- The full primary workflow can be operated with a keyboard.
- Panel resizing is keyboard accessible.
- Dialog focus is correctly managed.
- Narrow screens use functional tabs without destroying state.
- Critical statuses are announced and do not rely on color alone.
- The interface remains usable at 200% zoom.
- Reduced-motion preferences are respected.
- No light theme or new-window preview has been introduced.

## Explicitly out of scope

- Accessibility validation of arbitrary user preview content.
- Mobile-specific code keyboard enhancements.
- Vim, Emacs, and Emmet support.

## Suggested pull-request title

`feat: complete responsive and accessible playground UX`

---

# Milestone 12 — Security, Performance, Compatibility, and Release

## Goal

Harden the complete application, finish cross-browser verification, optimize load behavior, and prepare the first production release.

## Dependencies

All previous milestones.

## Deliverables

### Security hardening

Verify and test:

- User and external code execute only in sandboxed candidates and previews.
- No `allow-same-origin` is granted by default.
- Clipboard read is unavailable.
- Parent DOM and storage are inaccessible.
- Imported scripts require trust approval.
- Message payloads are validated and bounded.
- Resource protocols are validated.
- Preview source escaping handles script and style termination sequences.
- Imported files are size-limited and schema-validated.
- Secrets warning appears where appropriate.
- No unsanitized user content is inserted into the parent DOM.

### Performance

- Lazy-load Dart Sass, TypeScript compiler, ZIP generation, and other large optional features where practical.
- Confirm compiler workers do not block typing.
- Confirm stale work is discarded rather than queued indefinitely.
- Ensure CodeMirror instances are not recreated during normal updates.
- Measure the production bundle and document major chunks.
- Keep the application shell interactive within the specification's approximate target under a representative throttled test.

### Browser compatibility

Verify the latest two stable versions, as available in the test environment, of:

- Chrome.
- Edge.
- Firefox.
- Safari.

Document unavoidable clipboard, iframe, or permission-policy differences. The application must fail gracefully when a browser restricts an optional capability.

### End-to-end completion

Complete the specification's end-to-end matrix, including:

- Editors and preview.
- SCSS and TypeScript.
- Classic and module execution.
- Runtime console.
- Resources and failure behavior.
- Persistence and multiple projects.
- All export formats.
- Manual-run mode.
- Repository base path.
- Security isolation.
- Old execution teardown.

### Production deployment

- Verify a real GitHub Pages deployment from `main`.
- Confirm asset paths beneath the repository base path.
- Confirm custom-domain-compatible base configuration.
- Confirm workflows use `npm ci` and block deployment after failed required checks.
- Confirm no history-routing fallback is required.

### Documentation

Complete:

- User-facing README sections.
- Development setup.
- Architecture overview.
- Worker and preview message protocols.
- Storage schema and migration approach.
- Security model and limitations.
- External resource limitations.
- Export behavior.
- Browser support notes.
- Release checklist.

### Release audit

- Confirm MIT license.
- Confirm no telemetry or analytics dependencies.
- Remove unused dependencies and assets.
- Resolve or explicitly document all release-blocking issues.
- Map final evidence to every application-specification acceptance criterion.

## Required tests

- Complete unit, component, and end-to-end suites.
- Security regression suite.
- Base-path deployment test.
- Cross-browser Playwright tests where supported.
- Accessibility checks and manual review notes.
- Bundle inspection and worker responsiveness checks.

## Acceptance criteria

- Every v1 acceptance criterion from the application specification is satisfied or has a documented, approved exception.
- All required CI checks pass from a clean checkout.
- GitHub Pages deployment from `main` succeeds.
- The deployed app works under its repository base path.
- Security-isolation tests pass.
- Supported browsers complete the critical user journey.
- No analytics or telemetry are present.
- Documentation is sufficient for a new developer or coding agent to continue maintenance.

## Explicitly out of scope

All future enhancements listed in the application specification.

## Suggested pull-request title

`release: harden and prepare Glacier DEV Playground v1`

---

## 5. Recommended pull-request sequence

| Order | Milestone | Primary outcome |
|---:|---|---|
| 1 | M0 | Reproducible repository and deployment pipeline |
| 2 | M1 | Glacier shell and layout |
| 3 | M2 | Stable project model and in-memory behavior |
| 4 | M3 | Persistent multi-project workflow |
| 5 | M4 | Functional source editors |
| 6 | M5 | Secure staged preview |
| 7 | M6 | Console and runtime diagnostics |
| 8 | M7 | SCSS compilation |
| 9 | M8 | TypeScript and execution modes |
| 10 | M9 | External resources and trust handling |
| 11 | M10 | Import and export |
| 12 | M11 | Responsive and accessible UX |
| 13 | M12 | Release hardening and production validation |

Do not merge a milestone while its required tests are failing. Later milestones may be prototyped on branches, but they should not be merged before their dependencies.

---

## 6. Coding-agent task template

Use this template when assigning an individual milestone to a coding agent:

```text
Implement Milestone <ID> — <name> from
`glacier-dev-playground-implementation-milestones.md`.

Treat `glacier-dev-playground-specification-v2.md` as the product source of truth.
Inspect the repository and completed milestones before changing code.
Stay within the milestone scope and do not implement future enhancements.

Requirements:
- Implement every listed deliverable.
- Add or update the required automated tests.
- Preserve strict TypeScript and the browser-only architecture.
- Do not weaken preview sandboxing or message validation.
- Update documentation affected by the change.
- Run all available validation commands.

At completion, report:
1. Summary of changes.
2. Architectural decisions.
3. Files and major modules changed.
4. Tests added.
5. Commands run and results.
6. Known limitations explicitly deferred to later milestones.
7. Manual verification steps.
```

---

## 7. Review checklist for every agent pull request

### Scope

- [ ] Changes belong to the assigned milestone.
- [ ] No future enhancement was added accidentally.
- [ ] No backend, telemetry, light theme, JSX, or asset-upload behavior was introduced.

### Architecture

- [ ] Domain logic is separated from React presentation where practical.
- [ ] Worker and iframe boundaries use typed messages.
- [ ] User code remains isolated from the parent application.
- [ ] New dependencies are justified.

### Quality

- [ ] Strict TypeScript still passes.
- [ ] Biome passes.
- [ ] Unit and component tests pass.
- [ ] Production build passes.
- [ ] Relevant end-to-end tests pass.
- [ ] Base-path behavior remains intact.

### UX and safety

- [ ] Errors are actionable.
- [ ] Destructive actions require confirmation.
- [ ] Keyboard and focus behavior are preserved.
- [ ] User-controlled data is not injected unsafely.
- [ ] Existing project data is not silently discarded.

### Documentation

- [ ] README or architecture documentation is updated when necessary.
- [ ] Storage or protocol changes are documented.
- [ ] Deferred limitations are stated clearly.

---

## 8. Release completion rule

Glacier DEV Playground v1 is ready for release only after M12 has produced evidence that all application-specification acceptance criteria are satisfied, the GitHub Pages deployment from `main` is operational, and no release-blocking security, persistence, compilation, or portability issue remains.
