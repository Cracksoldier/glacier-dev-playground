# Glacier DEV Playground

## Application Specification

**Version:** 2.0  
**Status:** Implementation-ready  
**License:** MIT  
**Deployment target:** GitHub Pages  
**Default branch:** `main`

---

## 1. Purpose

Glacier DEV Playground is a browser-based code experimentation environment inspired by the workflow and general layout of CodePen.

The application provides separate editors for HTML, CSS or SCSS, and JavaScript or TypeScript, together with a live preview and integrated console. Users can create and manage multiple local projects, load external browser-compatible resources, and export their work in several portable formats.

The application is entirely client-side and must not require a backend, server-side runtime, account system, or cloud database.

---

## 2. Product goals

Glacier DEV Playground shall:

1. Provide a CodePen-inspired desktop layout with three source editors and a preview.
2. Support HTML, CSS, SCSS, JavaScript, and TypeScript.
3. Support classic-script and ES-module execution modes.
4. Compile SCSS and TypeScript entirely in the browser.
5. Display useful compiler, resource-loading, and runtime errors.
6. Allow users to add external stylesheets, fonts, classic scripts, and JavaScript modules.
7. Support multiple locally stored projects.
8. Export projects as JSON, standalone HTML, clipboard content, and ZIP archives.
9. Remain usable as a static GitHub Pages application.
10. Reuse the Glacier visual identity and dark styling family.
11. Remain fully client-side with no telemetry.

---

## 3. Non-goals

The first release will not provide:

- User accounts.
- Cloud synchronization.
- Collaborative editing.
- Public hosted project URLs.
- Server-side code execution.
- Runtime installation of npm packages by package name.
- Automatic npm package resolution.
- Automatic downloading of third-party TypeScript declarations.
- JSX or TSX support.
- Babel configuration.
- React, Vue, Angular, or other framework-specific build pipelines.
- Multiple source files per language.
- Local asset uploads.
- Filesystem-backed SCSS imports.
- Remote SCSS imports.
- Persistent storage for previewed user code.
- Preview popups, downloads, camera, microphone, geolocation, fullscreen, or pointer lock.
- Light theme.
- Vim or Emacs editor modes.
- Emmet support.
- Analytics, telemetry, or crash reporting.

---

## 4. Product name and branding

The application name is:

> **Glacier DEV Playground**

The application shall reuse and adapt the existing Glacier visual identity from:

- `https://cracksoldier.github.io/glacier-jwt/`
- `https://github.com/Cracksoldier/glacier-jwt`

### 4.1 Branding requirements

The interface shall:

- Reuse the Glacier snowflake mark.
- Use `GLACIER` as the primary wordmark.
- Use `DEV PLAYGROUND` as the product subtitle.
- Use a playground-specific favicon derived from the Glacier snowflake.
- Preserve the same visual family without copying CodePen branding or proprietary visual details.

### 4.2 Visual style

The interface shall use a dark Glacier theme with:

- Arctic navy backgrounds.
- Translucent or frosted panel surfaces.
- Cyan as the primary accent.
- Violet and mint as secondary accents.
- Clear contrast between editor chrome, preview, console, and dialogs.

Recommended font roles:

- **Chakra Petch:** headings, branding, and display text.
- **IBM Plex Sans:** interface text.
- **JetBrains Mono:** source editors, console output, and code-related UI.

The application shall support dark mode only in the first release.

---

## 5. Target users

The primary users are frontend developers, learners, and designers who want to quickly test browser-based code without creating a full local project.

Typical use cases include:

- Testing HTML structures.
- Experimenting with CSS Grid or Flexbox.
- Trying SCSS variables, nesting, and mixins.
- Creating small browser JavaScript interactions.
- Testing TypeScript snippets against browser APIs.
- Loading fonts, stylesheets, and browser libraries from CDNs.
- Reproducing small frontend bugs.
- Exporting experiments into standalone files.

---

## 6. Required technology stack

### 6.1 Application stack

- **Frontend framework:** React.
- **Application language:** TypeScript.
- **Build tool and development server:** Vite.
- **Package manager:** npm.
- **Editor:** CodeMirror 6.
- **SCSS compiler:** Dart Sass.
- **TypeScript compiler:** TypeScript compiler API.
- **Unit tests:** Vitest.
- **Component tests:** React Testing Library.
- **End-to-end tests:** Playwright.
- **Formatting and static analysis:** Biome.
- **Deployment:** GitHub Pages through GitHub Actions.

Vite is the build tool and development server. npm remains the package manager.

### 6.2 Version policy

Dependencies should use current stable versions that are compatible at implementation time.

The repository must commit `package-lock.json`.

CI and deployment must use:

```bash
npm ci
```

### 6.3 TypeScript project requirements

The application codebase shall use TypeScript strict mode.

The following require documented justification:

- `any`
- Non-null assertions
- Suppressed TypeScript errors
- Unchecked type casts

---

## 7. High-level layout

### 7.1 Desktop layout

The default layout shall resemble the following:

```text
┌──────────────────────────────────────────────────────────────┐
│ Header / Toolbar                                             │
├──────────────────┬──────────────────┬────────────────────────┤
│ HTML Editor      │ CSS/SCSS Editor  │ JS/TS Editor           │
│                  │                  │                        │
├──────────────────┴──────────────────┴────────────────────────┤
│ Preview                                                    │
├──────────────────────────────────────────────────────────────┤
│ Console / Errors                                            │
└──────────────────────────────────────────────────────────────┘
```

The editor panels shall be horizontally resizable.

The combined editor region and preview region shall be vertically resizable.

### 7.2 Responsive layout

On narrow screens, editors shall be displayed as tabs rather than simultaneous columns.

Recommended tabs:

- HTML
- CSS/SCSS
- JavaScript/TypeScript
- Preview
- Console

Changing tabs must not destroy editor state.

### 7.3 Mobile scope

Mobile support is functional rather than optimized for long coding sessions.

Desktop and tablet are the primary targets.

---

## 8. Header toolbar

The header shall include:

- Glacier DEV Playground branding.
- Active project title.
- Project switcher.
- New project action.
- Run button.
- Auto-run toggle.
- Save-status indicator.
- Resource manager action.
- Project settings action.
- Import action.
- Export action.
- Reset project action.
- Preview layout controls where space permits.

Destructive actions must require confirmation.

---

## 9. Local project management

The first release shall support multiple locally saved projects.

### 9.1 Required project actions

Users shall be able to:

- Create a project.
- Rename a project.
- Duplicate a project.
- Delete a project.
- Switch between projects.
- Reset a project to a template.

The application shall reopen the last active project on startup.

Folders, tags, cloud sync, and collaboration are outside the initial scope.

### 9.2 Autosave

Projects shall autosave locally after a debounce delay.

`Ctrl/Cmd + S` shall:

- Prevent the browser's native Save Page dialog.
- Force an immediate local save.

The application shall display one of these states:

- Saving
- Saved
- Save failed
- Storage unavailable

### 9.3 Leaving the page

The application shall warn before closing or navigating away only when:

- A local save is pending, or
- The most recent save failed.

It must not display unnecessary leave-page warnings after successful saves.

---

## 10. Project initialization and templates

On first launch, the application shall create a starter project.

The first release shall include at least:

- Empty project.
- Basic HTML example.
- SCSS example.
- JavaScript interaction example.
- TypeScript example.

Selecting a template shall replace the current project only after confirmation.

If persisted data is invalid or unreadable, the application shall offer recovery without preventing the application from loading.

---

## 11. HTML editor

### 11.1 Editing features

The HTML editor shall provide:

- HTML syntax highlighting.
- Automatic indentation.
- Bracket matching.
- Closing-tag assistance.
- Line numbers.
- Search and replace.
- Undo and redo.
- Configurable tab size.
- Keyboard indentation.

### 11.2 HTML scope

The HTML editor shall primarily represent document body content.

The application shall provide a separate advanced **Head content** field in project settings for content such as:

- Meta elements.
- Link elements.
- Page title.
- Inline configuration.
- Additional head-level markup.

### 11.3 Inline scripts and styles

`<script>` and `<style>` elements entered in the HTML editor shall be permitted and executed inside the preview sandbox.

### 11.4 Relative URLs

Relative asset paths are not portable and shall not be supported as a first-class feature.

Examples:

```html
<img src="./image.png">
```

```css
background-image: url("./image.png");
```

The application shall warn that users should prefer:

- Absolute HTTPS URLs.
- Data URLs.
- External CDN URLs.

Local asset uploads are outside scope.

---

## 12. CSS and SCSS editor

### 12.1 Language modes

The stylesheet editor shall support:

- CSS
- SCSS

The selected mode shall be stored per project.

### 12.2 CSS mode

In CSS mode, source shall be inserted directly into the preview document.

### 12.3 SCSS mode

In SCSS mode, source shall be compiled into CSS before preview execution.

Compilation shall:

- Run entirely in the browser.
- Use Dart Sass.
- Run inside a Web Worker.
- Avoid blocking the main UI thread.
- Discard stale compilation results.

### 12.4 SCSS scope

The first release supports one SCSS source file.

Supported:

- Variables.
- Nesting.
- Mixins.
- Functions.
- Sass built-in modules where browser compilation supports them.

Not supported:

- Filesystem-relative imports.
- Project-relative `@use` or `@import` files.
- Remote SCSS imports.
- Custom virtual multi-file import resolution.

### 12.5 SCSS errors

Compilation errors shall display:

- Error message.
- Line number.
- Column number when available.
- Source excerpt when available.

Selecting an error shall focus the relevant editor location.

When SCSS compilation fails:

- User JavaScript shall not run for the failed build.
- The preview shall keep showing the last successful build.
- The interface shall clearly explain that the displayed preview is stale.

### 12.6 Compiled CSS view

The CSS panel shall provide a read-only **Compiled CSS** view when SCSS mode is active.

### 12.7 Auto-run interaction

When auto-run is enabled, SCSS shall compile after the preview debounce.

When auto-run is disabled, SCSS shall compile only when Run is selected.

---

## 13. JavaScript and TypeScript editor

### 13.1 Language controls

The third editor shall have two independent selectors:

```text
Language:  JavaScript | TypeScript
Execution: Classic    | ES module
```

Supported combinations:

- JavaScript + Classic.
- JavaScript + ES module.
- TypeScript + Classic.
- TypeScript + ES module.

### 13.2 JavaScript editing features

The editor shall provide:

- Syntax highlighting.
- Automatic indentation.
- Bracket matching.
- Search and replace.
- Line numbers.
- Undo and redo.
- Basic completion.

### 13.3 TypeScript scope

TypeScript support shall include:

- `.ts` syntax.
- Single-file type checking.
- Diagnostics.
- Browser and DOM standard type definitions.
- Transpilation to JavaScript.
- Compiler errors linked to editor positions.

Not supported:

- JSX.
- TSX.
- Babel.
- React-specific compilation.
- Multi-file TypeScript projects.
- `tsconfig.json` editing.
- Automatic installation or downloading of third-party declarations.

### 13.4 TypeScript compiler architecture

TypeScript type checking and transpilation shall run in a Web Worker.

Only the newest compilation result may update the preview.

Stale worker results must be discarded.

### 13.5 Module imports

ES-module mode shall permit absolute HTTPS imports, for example:

```ts
import confetti from "https://cdn.example.com/confetti.js";
```

Restrictions:

- Only absolute HTTPS module URLs are permitted in production.
- Bare package imports such as `lodash` are not resolved.
- Relative imports are not supported.
- Remote TypeScript declarations are not downloaded automatically.
- Browser CORS restrictions apply.
- Import errors shall appear in the integrated console.

### 13.6 Classic mode

In classic mode:

- `import` and `export` syntax shall be rejected.
- User code runs as a classic browser script.
- Global variables behave according to normal classic-script rules.

### 13.7 Error behavior

TypeScript or JavaScript compile errors shall:

- Prevent user code execution for that run.
- Leave the last successful preview visible.
- Display a clear error to the user.

---

## 14. External resources

Users shall manage external resources through a dedicated dialog.

### 14.1 Supported resource types

- Stylesheet.
- Font stylesheet.
- Classic JavaScript.
- JavaScript module.

### 14.2 Resource fields

Each resource shall include:

- Unique ID.
- Display name.
- URL.
- Resource type.
- Enabled state.
- Load order.
- Optional integrity hash.
- Optional `crossorigin` value.

Comments are not required for the MVP.

### 14.3 Resource order

Resources shall be reorderable.

Enabled resources shall load in configured order.

Disabled resources remain stored but are excluded from preview execution.

### 14.4 URL rules

Production accepts:

- `https:`

Local development may additionally allow:

- `http:`

The following shall be rejected:

- `javascript:`
- `data:` for external resource entries
- `file:`
- `vbscript:`

The UI shall warn about mixed-content HTTP resources in production.

### 14.5 Browser-compatible URLs

Users must enter complete browser-compatible URLs.

Invalid example:

```text
lodash
```

Valid examples include browser-ready URLs from:

- jsDelivr.
- unpkg.
- esm.sh.
- Google Fonts.
- Other browser-compatible CDNs.

### 14.6 Loading behavior

External CSS shall load before user CSS so user styles can override library styles.

Classic scripts shall load sequentially in configured order.

Module resources shall load after classic scripts.

User JavaScript or compiled TypeScript shall execute only after all enabled script resources have loaded successfully.

Stylesheet loading does not block user code execution.

### 14.7 Failed resources

When an enabled JavaScript dependency fails:

- User code shall not execute.
- The application shall display a visible error.
- The console shall identify the resource name and URL.
- The last successful preview shall remain visible.

### 14.8 Resource attributes

The first release shall support:

- `integrity`
- `crossorigin`

The application shall manage execution order internally instead of exposing arbitrary `async` or `defer` controls.

### 14.9 Resource presets

The first release shall include presets or helpers for:

- Bootstrap CSS and JavaScript.
- Alpine.js.
- Lodash.
- Font Awesome Free.
- Normalize.css.
- Google Fonts URL helper.

Framework presets for React and Vue are outside scope.

### 14.10 Head content

The application shall provide a separate advanced Head content field in project settings.

This field complements structured resource entries and shall not replace the resource manager.

---

## 15. Preview generation

### 15.1 Generated document order

The application shall build the preview document in this order:

1. `<!doctype html>`.
2. Generated `<html>` element.
3. Generated `<head>`.
4. Character encoding.
5. Viewport metadata.
6. User-configured head content.
7. External stylesheet and font resources.
8. Compiled or raw user CSS.
9. User HTML body content.
10. Console and error bridge.
11. External classic scripts.
12. External module resources.
13. User JavaScript or compiled TypeScript.

### 15.2 Rendering mechanism

The preview shall render inside a sandboxed iframe using `srcdoc` or an equivalent isolated-document mechanism.

Each run shall create a fresh execution context by replacing the iframe content or iframe instance.

This must terminate old:

- Timers.
- Event handlers.
- DOM state.
- Variables.
- Pending asynchronous work where browser teardown permits it.

### 15.3 Auto-run

When auto-run is enabled, preview updates shall be debounced.

Default debounce range:

- 300–500 ms.

When auto-run is disabled, changes shall not update the preview until Run is selected.

### 15.4 Build snapshot

Every preview run shall use an immutable project snapshot.

Only the latest requested compilation and execution may update the preview.

### 15.5 Build flow

A preview update shall:

1. Capture the current project snapshot.
2. Assign a compilation ID and execution ID.
3. Validate external resources.
4. Compile SCSS if enabled.
5. Type-check and compile TypeScript if enabled.
6. Stop on compile errors.
7. Build the preview document.
8. Replace the iframe execution context.
9. Wait for the preview-ready signal.
10. Display console and runtime events.
11. Ignore stale execution messages.

---

## 16. Preview security and capabilities

Because the application executes arbitrary user code, isolation is a core requirement.

### 16.1 Required isolation

User code shall:

- Execute only in the preview iframe.
- Never execute in the parent application context.
- Not access the editor DOM.
- Not access parent local storage.
- Not access parent IndexedDB.
- Not access parent application state.
- Not access parent cookies.

### 16.2 Sandbox permissions

The preview shall allow:

- Scripts.
- Forms.
- Modal dialogs.
- Clipboard write, subject to browser support and user interaction requirements.

The preview shall not allow:

- Clipboard read.
- Downloads.
- Popups or new windows.
- Camera.
- Microphone.
- Geolocation.
- Fullscreen.
- Pointer lock.
- Persistent preview storage.

The exact iframe sandbox and Permissions Policy configuration shall be the most restrictive combination that still supports the required capabilities.

`allow-same-origin` shall not be granted by default.

### 16.3 Network access

Preview code may use:

- `fetch`.
- XMLHttpRequest.
- WebSockets.
- External images.
- External stylesheets.
- External scripts.

Normal browser CORS, CSP, and mixed-content restrictions still apply.

### 16.4 Clipboard behavior

Preview code may write to the clipboard only.

Clipboard writing must respect:

- Browser permission rules.
- Secure-context requirements.
- User gesture requirements.

Clipboard reading is prohibited.

### 16.5 Preview storage

Preview code shall not receive persistent local storage or IndexedDB capabilities as a supported feature.

Every preview run is expected to start with a clean execution context.

### 16.6 No new-window preview

The MVP shall not include “Open preview in new window.”

Instead, it shall support:

- Expand preview.
- Full-window preview inside the application.
- Standalone HTML export.

---

## 17. Preview messaging protocol

The iframe and parent shall communicate through validated `window.postMessage()` events.

Example protocol:

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

The parent shall validate:

- Message source.
- Protocol identifier.
- Protocol version.
- Execution ID.
- Message type.
- Payload shape.

Unknown or stale messages shall be ignored.

---

## 18. Console and errors

### 18.1 Console capture

The application shall capture:

- `console.log`
- `console.info`
- `console.warn`
- `console.error`
- `console.debug`
- `console.clear`

It shall also capture:

- JavaScript runtime errors.
- TypeScript compile errors.
- JavaScript syntax errors.
- SCSS compile errors.
- Unhandled Promise rejections.
- External resource failures.
- Preview renderer errors.

### 18.2 Console presentation

Console entries shall display:

- Severity.
- Relative timestamp.
- Message.
- Expandable arrays and objects.

Interactive command input and network inspection are outside scope.

### 18.3 Serialization

Values shall be serialized safely.

Circular references or unsupported browser objects must not break the console bridge.

### 18.4 Preserve logs

Logs shall clear on every new preview run by default.

Users may enable **Preserve logs** per project.

### 18.5 Source mapping

Runtime error positions should map back to editor lines using:

- Generated line-offset tracking.
- Source URL markers where practical.

Full source-map generation is not required for the MVP.

Selecting an error should focus the nearest relevant source location.

---

## 19. Persistence

### 19.1 Storage technology

Use IndexedDB for:

- Projects.
- Project metadata.
- Active-project selection.
- Schema versioning.

Small interface preferences may use local storage.

Examples:

- Active tab.
- Panel sizes.
- Console visibility.
- Editor font size.
- Tab width.
- Word wrapping.

### 19.2 Storage failure

The application shall remain usable when storage is unavailable.

It shall clearly warn that projects cannot be preserved.

### 19.3 Schema migration

Persisted project data shall use a versioned schema.

The application shall support explicit migration between known schema versions.

Unsupported future versions must not be silently imported or opened.

---

## 20. Project data model

A project should use a structure similar to:

```ts
interface PlaygroundProject {
  schemaVersion: number;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;

  source: {
    html: string;
    stylesheet: string;
    stylesheetLanguage: "css" | "scss";
    script: string;
    scriptLanguage: "javascript" | "typescript";
    executionMode: "classic" | "module";
    headContent: string;
  };

  resources: ExternalResource[];

  settings: {
    autoRun: boolean;
    previewDebounceMs: number;
    preserveConsole: boolean;
  };
}

interface ExternalResource {
  id: string;
  name: string;
  url: string;
  type:
    | "stylesheet"
    | "font-stylesheet"
    | "script"
    | "module";
  enabled: boolean;
  order: number;
  integrity?: string;
  crossOrigin?: "anonymous" | "use-credentials";
}
```

Unknown properties may be ignored when safe.

---

## 21. Import and export

### 21.1 JSON export

Users shall be able to export a project as JSON.

The export shall include:

- Schema version.
- Project metadata.
- All source code.
- Language and execution settings.
- External resource URLs and metadata.
- Project settings.

External resources shall be stored as URLs only.

### 21.2 JSON import

Imported JSON shall be treated as untrusted input.

The application shall:

- Enforce a reasonable file-size limit, initially 5 MB.
- Validate the schema.
- Reject unsupported schema versions.
- Preserve the current project if validation fails.
- Require confirmation before replacing an existing project.
- Display a trust warning before running imported external scripts for the first time.

### 21.3 Standalone HTML export

Users shall be able to export a standalone HTML document containing:

- External resources.
- Compiled CSS.
- HTML.
- Classic or module JavaScript.

When SCSS is used, export the compiled CSS.

When TypeScript is used, export the compiled JavaScript.

When module mode is used, export user code inside:

```html
<script type="module">
```

The standalone HTML need not work offline because external resources remain remote URLs.

### 21.4 Copy to clipboard

Users shall be able to copy the generated standalone HTML to the clipboard from the parent application.

### 21.5 ZIP export

ZIP exports shall include runnable files and original editable sources.

Base structure:

```text
index.html
style.css
script.js
```

When SCSS or TypeScript is used, also include:

```text
src/
├── style.scss
└── script.ts
```

Only relevant source files shall be added.

The root files must run directly in a browser without requiring a build step.

---

## 22. Editor preferences

Users shall be able to configure:

- Editor font size.
- Tab width.
- Word wrapping.
- Line numbers.
- Auto-run.
- Preview debounce delay within a safe range.

The editor and application shell shall use the same dark Glacier theme family.

---

## 23. Keyboard shortcuts

The application shall support, where they do not conflict with browser or operating-system behavior:

- `Ctrl/Cmd + Enter`: Run project.
- `Ctrl/Cmd + S`: Force immediate local save.
- `Ctrl/Cmd + F`: Search focused editor.
- `Ctrl/Cmd + Shift + F`: Reserved for future project-wide search.
- `Ctrl/Cmd + Z`: Undo.
- `Ctrl/Cmd + Shift + Z`: Redo.
- `Alt + 1`: Focus HTML editor.
- `Alt + 2`: Focus CSS/SCSS editor.
- `Alt + 3`: Focus JavaScript/TypeScript editor.
- `Alt + 4`: Focus preview.
- `Escape`: Close active dialog.

A keyboard-shortcuts help dialog shall be available.

Vim and Emacs modes are outside scope.

---

## 24. Accessibility

The application interface shall target WCAG 2.2 AA, excluding arbitrary user-generated preview content.

Requirements include:

- Accessible names for all toolbar controls.
- Keyboard-operable dialogs.
- Focus trapping in dialogs.
- Focus restoration after dialogs close.
- Keyboard-accessible panel resizing.
- Status indicators that do not rely only on color.
- Errors associated with the relevant editor.
- Usability at 200% browser zoom.
- Sufficient color contrast.
- Respect for reduced-motion preferences.
- Screen-reader announcements for compilation and runtime failures.
- Programmatically identifiable editor panel headings.

---

## 25. Performance

The application shall:

- Keep editing responsive during SCSS and TypeScript compilation.
- Run compilers in Web Workers.
- Discard outdated compilation requests.
- Avoid unlimited preview build queues.
- Avoid recreating CodeMirror instances on normal state changes.
- Lazy-load large optional dependencies where practical.

Candidates for lazy loading include:

- Dart Sass.
- TypeScript compiler worker.
- Import/export dialogs.
- ZIP generation.
- Resource manager.

The application shell should become interactive within approximately three seconds on a typical broadband desktop connection after normal caching behavior.

---

## 26. Browser support

Support the latest two stable versions of:

- Google Chrome.
- Microsoft Edge.
- Mozilla Firefox.
- Safari.

Required browser capabilities include:

- ES modules.
- Web Workers.
- IndexedDB.
- Blob URLs.
- iframe `srcdoc` or equivalent fallback.
- `window.postMessage`.
- Clipboard write support where available.

An unsupported-browser message shall appear when a required feature is missing.

---

## 27. Internal architecture

### 27.1 Main modules

#### Application shell

Responsible for:

- Global layout.
- Toolbar.
- Branding.
- Dialog management.
- Keyboard shortcuts.

#### Project store

Responsible for:

- Current project state.
- Project list.
- Create, rename, duplicate, delete, and switch operations.
- Dirty-state tracking.
- Active-project selection.

#### Editor subsystem

Responsible for:

- CodeMirror instances.
- Language configuration.
- Diagnostics.
- Focus management.
- Editor settings.

#### SCSS compiler worker

Responsible for:

- Compiling SCSS.
- Returning CSS.
- Returning structured diagnostics.
- Discarding stale work.

#### TypeScript compiler worker

Responsible for:

- Single-file type checking.
- DOM and browser typings.
- Transpilation.
- Returning diagnostics.
- Discarding stale work.

#### Preview renderer

Responsible for:

- Building the preview document.
- Escaping embedded source safely.
- Creating execution IDs.
- Replacing iframe execution contexts.
- Processing validated preview messages.

#### Resource manager

Responsible for:

- URL validation.
- Resource ordering.
- Presets.
- Enable/disable state.
- Resource-load diagnostics.

#### Persistence repository

Responsible for:

- IndexedDB access.
- Schema migration.
- Save-status reporting.
- Recovery from corrupt state.

#### Import/export service

Responsible for:

- JSON validation.
- JSON serialization.
- Standalone HTML generation.
- Clipboard output.
- ZIP generation.

### 27.2 Suggested source structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── AppShell.tsx
│   └── routes.ts
├── components/
│   ├── editors/
│   ├── preview/
│   ├── console/
│   ├── projects/
│   ├── resources/
│   ├── settings/
│   └── common/
├── features/
│   ├── project/
│   ├── compilation/
│   ├── persistence/
│   ├── import-export/
│   └── preview-runtime/
├── workers/
│   ├── scssCompiler.worker.ts
│   └── typescriptCompiler.worker.ts
├── models/
│   ├── project.ts
│   └── messages.ts
├── services/
│   ├── previewDocumentBuilder.ts
│   ├── resourceValidator.ts
│   └── projectRepository.ts
├── styles/
├── test/
└── main.tsx
```

---

## 28. Security requirements

### 28.1 Code execution

- User code must never execute in the application window.
- External resources must execute only inside the preview iframe.
- The iframe must not receive `allow-same-origin` by default.

### 28.2 Message validation

Every iframe message must be validated before use.

### 28.3 Resource validation

External resource URLs must be validated against allowed protocols and expected resource types.

### 28.4 DOM safety

User-controlled strings must not be inserted into the application UI using unsanitized `innerHTML`.

### 28.5 Preview document escaping

Generated preview content must safely handle closing script and style sequences, including:

```js
const value = "</script>";
```

```css
.example::after {
  content: "</style>";
}
```

### 28.6 Imported data

Imported JSON must be validated and size-limited.

### 28.7 Secrets

The application shall not store credentials, tokens, or secrets.

The interface shall warn users that secrets entered into frontend code are visible to visitors and external scripts.

---

## 29. GitHub Pages deployment

### 29.1 Deployment workflow

The workflow shall be stored at:

```text
.github/workflows/deploy.yml
```

### 29.2 Deployment triggers

Deployment shall run on:

- Pushes to `main`.
- Manual workflow dispatch.

Pull requests shall run validation but shall not deploy production builds.

Temporary pull-request preview deployments are outside scope.

### 29.3 Required deployment stages

The deployment workflow shall:

1. Check out the repository.
2. Set up an active Node.js LTS version.
3. Restore npm cache.
4. Run `npm ci`.
5. Run static analysis.
6. Run unit tests.
7. Build the application.
8. Configure GitHub Pages.
9. Upload the `dist` directory.
10. Deploy the Pages artifact.

### 29.4 Permissions

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

### 29.5 Concurrency

Only one Pages deployment shall be active at a time.

Newer deployments may cancel older in-progress deployments.

### 29.6 Base path

The application shall support:

- Root deployment.
- Repository Pages deployment under `/<repository-name>/`.
- Custom GitHub Pages domains.

The base path shall be provided through Vite configuration or a build-time environment variable.

Application code must not hard-code root-relative asset paths.

### 29.7 Routing

The MVP shall avoid browser-history routing.

Dialogs, selected projects, and selected tabs shall be represented through application state rather than URL routes.

---

## 30. Required npm scripts

The project shall provide equivalent scripts to:

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

`vite preview` is for local verification of the static build and is not the production hosting server.

---

## 31. Testing requirements

### 31.1 Unit tests

Unit tests shall cover:

- Project creation.
- Project duplication.
- Project deletion.
- Project schema migration.
- Resource URL validation.
- Resource ordering.
- Preview document generation.
- Script and style escaping.
- Message validation.
- Import validation.
- Export serialization.
- SCSS worker results.
- TypeScript worker results.
- Stale compilation handling.
- ZIP structure generation.

### 31.2 Component tests

Component tests shall cover:

- Editor panel controls.
- CSS/SCSS selector.
- JavaScript/TypeScript selector.
- Classic/module selector.
- Auto-run control.
- Project switcher.
- Resource management.
- Settings dialog.
- Error display.
- Save-status display.
- Import confirmation.
- Reset confirmation.

### 31.3 End-to-end tests

End-to-end tests shall verify:

1. Editing HTML updates the preview.
2. Editing CSS updates the preview.
3. Valid SCSS compiles and updates the preview.
4. Invalid SCSS displays a diagnostic.
5. JavaScript executes in the preview.
6. TypeScript type-checks and executes after compilation.
7. TypeScript errors prevent execution.
8. Runtime errors appear in the console.
9. Unhandled Promise rejections appear in the console.
10. External stylesheets load.
11. External classic scripts load in order.
12. ES modules load.
13. Failed script resources prevent user-code execution.
14. Projects survive page reloads.
15. Multiple projects can be created and switched.
16. JSON export and import preserve project data.
17. Standalone HTML exports run independently.
18. Clipboard export works where browser support permits it.
19. ZIP exports contain runnable files and source files.
20. Manual-run mode does not update automatically.
21. The application works under a repository base path.
22. Preview scripts cannot access the editor DOM or parent storage.
23. Clipboard read is unavailable to preview code.
24. Old preview runs do not continue executing after a refresh.

### 31.4 Continuous integration

Every pull request shall run:

```bash
npm ci
npm run check
npm run test
npm run build
```

End-to-end tests may run in a separate job.

Deployment shall be blocked when required checks fail.

---

## 32. Error handling

Errors shall be user-friendly and actionable.

Each error should explain:

- What failed.
- Where it failed.
- Whether project data is safe.
- Whether the preview is showing the last successful build.
- What corrective action is available.

Example:

```text
SCSS compilation failed at line 14, column 7.
The preview is showing the last successful build.
```

Unexpected application errors may be written to the browser developer console while the UI displays a safe recovery message.

The application shall provide a recovery action that reloads the editor without deleting persisted projects.

---

## 33. Acceptance criteria

The first release is complete when all of the following are true:

1. Glacier DEV Playground loads successfully from a GitHub Pages repository URL.
2. The dark Glacier visual identity is applied consistently.
3. HTML, CSS/SCSS, and JavaScript/TypeScript editors are visible on desktop.
4. Editor panels and preview can be resized.
5. Narrow screens use a functional tabbed layout.
6. Multiple local projects can be created, renamed, duplicated, deleted, and switched.
7. The last active project reopens after page reload.
8. `Ctrl/Cmd + S` forces an immediate local save.
9. HTML changes render correctly.
10. CSS changes render correctly.
11. SCSS compiles in a Web Worker.
12. SCSS errors include useful source positions.
13. Compiled CSS can be viewed.
14. JavaScript executes only inside the preview iframe.
15. TypeScript receives single-file diagnostics and compiles in a Web Worker.
16. TypeScript errors prevent execution and display clearly.
17. Classic and module execution modes work.
18. Absolute HTTPS ES-module imports work where browser CORS permits them.
19. Runtime logs, errors, and unhandled rejections appear in the integrated console.
20. External stylesheets can be added and reordered.
21. External font stylesheets can be added.
22. Classic scripts load sequentially.
23. Module resources load after classic scripts.
24. Failed script resources prevent user-code execution and display an error.
25. Presets exist for Bootstrap, Alpine.js, Lodash, Font Awesome Free, Normalize.css, and Google Fonts.
26. Projects autosave to IndexedDB.
27. JSON export and import work.
28. Imported projects with external scripts require a trust warning before first execution.
29. Standalone HTML export works.
30. Standalone HTML can be copied to the clipboard.
31. ZIP export includes runnable root files and original SCSS/TypeScript sources where relevant.
32. Manual-run and auto-run modes both work.
33. The main workflow is keyboard accessible.
34. Panel resizing is keyboard accessible.
35. Preview code can use forms and modal dialogs.
36. Preview code may write to the clipboard under browser restrictions.
37. Preview code cannot read the clipboard.
38. Preview code cannot access parent DOM or parent storage.
39. Preview code does not receive persistent supported storage.
40. Pull requests run validation checks.
41. Pushes to `main` deploy through GitHub Actions.
42. Deployed assets load correctly under a repository base path.
43. No analytics or telemetry are included.
44. The repository includes an MIT license.

---

## 34. Implementation milestones

### Milestone 0 — Project foundation

- Create React and TypeScript Vite project.
- Configure npm and lockfile policy.
- Enable strict TypeScript.
- Configure Biome.
- Configure Vitest.
- Configure Playwright.
- Add MIT license.
- Add CI workflow.
- Add GitHub Pages deployment workflow.
- Verify repository base-path deployment.

### Milestone 1 — Glacier application shell

- Add Glacier branding and assets.
- Implement dark theme.
- Add header toolbar.
- Add desktop layout.
- Add responsive tab layout.
- Add resizable panels.
- Add keyboard-accessible resizing.

### Milestone 2 — Project management and persistence

- Implement IndexedDB repository.
- Add project schema.
- Add project switcher.
- Add create, rename, duplicate, and delete actions.
- Add autosave and save-status indicator.
- Restore the last active project.
- Add starter templates.

### Milestone 3 — Editors and preview runtime

- Integrate CodeMirror 6.
- Add HTML editor.
- Add CSS/SCSS editor.
- Add JavaScript/TypeScript editor.
- Add language and execution selectors.
- Implement sandboxed iframe preview.
- Implement auto-run and manual-run modes.
- Add execution IDs and stale-run protection.

### Milestone 4 — SCSS and TypeScript compilation

- Add SCSS compiler worker.
- Add TypeScript compiler worker.
- Add diagnostics.
- Add compiled CSS view.
- Prevent execution on compiler errors.
- Preserve the last successful preview.

### Milestone 5 — Console and resource manager

- Add console bridge.
- Capture logs, errors, and unhandled rejections.
- Add resource manager.
- Add URL validation.
- Add sequential script loading.
- Add resource presets.
- Add imported-script trust warning.

### Milestone 6 — Import and export

- Add JSON export.
- Add JSON import and validation.
- Add standalone HTML export.
- Add copy-to-clipboard export.
- Add ZIP export.
- Preserve original SCSS and TypeScript sources in ZIP archives.

### Milestone 7 — Hardening and release

- Complete accessibility review.
- Complete browser compatibility testing.
- Add security tests.
- Optimize bundle loading.
- Complete end-to-end tests.
- Validate production GitHub Pages deployment.
- Prepare user and developer documentation.

---

## 35. Future enhancements

Possible later features include:

- Multiple source files.
- Asset uploads.
- URL-encoded share links.
- GitHub Gist integration.
- npm package search with CDN resolution.
- HTML, CSS, and JavaScript formatters.
- JSX and TSX support.
- Framework-specific playground modes.
- Device-size preview presets.
- Screenshot generation.
- Accessibility auditing of preview content.
- HTML and CSS validation.
- Project history and snapshots.
- Cloud synchronization.
- User accounts.
- Collaboration.
- Embedded project mode.
- Presentation mode.
- Interactive console input.
- Network request inspection.
- Vim or Emacs keybindings.
- Emmet abbreviations.
- Optional light Glacier theme.

---

## 36. Final implementation constraints

The following decisions are mandatory for version 1:

- React and TypeScript application.
- Vite build tooling.
- npm package management.
- CodeMirror 6 editors.
- Browser-only architecture.
- Multiple local projects.
- SCSS support through Dart Sass.
- TypeScript support with full single-file diagnostics.
- Web Worker compilation.
- Classic and ES-module execution.
- Absolute HTTPS module imports.
- Structured external resources and presets.
- Sandboxed iframe preview.
- Forms, modals, and clipboard write only in the preview.
- No preview clipboard reading.
- No persistent preview storage.
- JSON, standalone HTML, clipboard, and ZIP export.
- Glacier dark branding only.
- GitHub Pages deployment from `main`.
- No telemetry.
- MIT license.

