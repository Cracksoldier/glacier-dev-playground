# Export and import

The Export dialog offers four actions. JSON export saves the project exactly as authored, SCSS and TypeScript included, so it can be imported again. The other three — HTML download, clipboard copy, and ZIP — compile the project first (SCSS to CSS, TypeScript to JavaScript), so they never ship something that needs a build step to run. A compile failure aborts that export and reports the error in the dialog rather than producing a broken artifact.

Filenames are derived from the project title: lowercased, non-alphanumeric runs collapsed to single hyphens, trimmed, falling back to `project` when nothing alphanumeric remains.

## Download JSON

The portable project format, and the only format that can be imported back.

```jsonc
{
  "schemaVersion": 2,
  "title": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "source": { "html": "...", "stylesheet": "...", "stylesheetLanguage": "css|scss",
              "script": "...", "scriptLanguage": "javascript|typescript",
              "executionMode": "classic|module", "headContent": "..." },
  "resources": [ /* external resources, in order */ ],
  "settings": { "autoRun": true, "previewDebounceMs": 0, "preserveConsole": false }
}
```

It carries the **original** source, not the compiled output — SCSS stays SCSS, TypeScript stays TypeScript.

Two fields are deliberately absent:

- `id`, because it is local identity only; re-import always mints a fresh one, so importing a file twice gives two independent projects rather than silently overwriting.
- `trusted`, because a file must never be able to assert its own safety. The importer forces it to `false` regardless, so omitting it makes the artifact honest about what it is.

## Download HTML

A single self-contained document with the compiled CSS and compiled script inlined, the user's `<head>` content preserved, and external resources emitted as real `<link>`/`<script>` tags in their configured order. It contains no console bridge and no `postMessage` wiring — it is a plain page, runnable by double-clicking it.

External resources still have to be reachable from wherever the file is opened, and relative asset URLs in the user's own source will not resolve from a `file://` origin. The export flow shows an advisory when it detects relative or plain-`http:` asset URLs; it warns rather than blocks.

## Copy HTML

The same standalone document, written to the clipboard instead of to disk.

`navigator.clipboard.writeText` is not always available or permitted — it needs a secure context, and browsers can still reject it. When the API is missing, or the write throws, the dialog falls back to showing the generated HTML in a selectable textarea so it can be copied manually. The export is never silently lost.

## Download ZIP

An archive built with `fflate`, loaded lazily so that visitors who never export a ZIP never download the compression code.

Always present, at the archive root:

- `index.html` — like the standalone export, but linking `style.css` and `script.js` as sibling files rather than inlining them.
- `style.css` — compiled CSS.
- `script.js` — compiled JavaScript.

Conditionally present:

- `src/style.scss` — only when the project's stylesheet language is SCSS.
- `src/script.ts` — only when the project's script language is TypeScript.

The original sources appear exactly once, under `src/`, and the compiled output exactly once, at the root. A CSS/JavaScript project gets no `src/` directory at all.

## Import

Import accepts the JSON format above. By default it adds the file as a **new** project; alternatively, after an explicit confirmation, it replaces the active project's title, source, resources, and settings (the project keeps its id and creation date). A rejected file leaves the workspace exactly as it was.

Validation, in order:

1. Payloads over 5 MB are rejected before parsing, so a pathological file cannot be parsed into memory first.
2. The text must be valid JSON describing an object.
3. Every field is checked individually, with a specific message naming the offending path — `source.stylesheetLanguage: expected "css" or "scss"`, `resources[2].url: …`, and so on.
4. Every resource URL goes through the same validator the manual resource form uses, so an import cannot introduce a `javascript:` or `data:` URL.

Identity and trust fields from the file are ignored: a fresh `id` is minted, timestamps are set locally, `schemaVersion` is the current one, and `trusted` is forced to `false`. An imported project with an enabled script or module resource therefore hits the trust gate before anything executes — see [security.md](./security.md).
