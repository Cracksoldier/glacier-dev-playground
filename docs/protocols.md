# Message protocols

Three `postMessage` channels cross a trust or thread boundary. Each has a dedicated module holding its message types *and* its validation predicate, so there is exactly one place where an inbound message becomes typed.

Every message carries a `protocol` string and a numeric `version`. A receiver rejects anything whose pair does not match its own constants — which is what keeps a stale cached worker script, or a preview document left over from a previous deploy, from being interpreted against the current shapes.

## Preview → parent (`src/preview/previewMessage.ts`)

`protocol: "glacier-dev-playground-preview"`, `version: 1`.

Every message also carries `executionId`, the build coordinator's id for the run that produced it. The parent drops messages whose id is no longer current, which is how a superseded run's console output never appears.

| `type` | `payload` |
| --- | --- |
| `ready` | `{ timestampMs }` — the bridge is installed and user code is about to run. |
| `resources-ready` | `{ timestampMs }` — all enabled external resources finished loading. |
| `console` | `{ level, args: SerializedValue[], timestampMs }` where `level` is `log \| info \| warn \| error \| debug \| clear`. |
| `runtime-error` | `{ message, line?, column?, stack?, timestampMs }`. |
| `unhandled-rejection` | `{ reason: SerializedValue, timestampMs }`. |
| `resource-error` | `{ url, message, timestampMs }`. |

`isPreviewMessage` is the single validation boundary. It checks protocol, version, a non-empty `executionId`, a known `type`, and the payload shape for that type — including recursive structural validation of every `SerializedValue`.

This is the only one of the three channels where the sender is genuinely outside the app's trust boundary. The preview iframe runs with an opaque origin (see [security.md](./security.md)), so the parent cannot assert the sender's origin and must validate structurally instead.

### `SerializedValue`

Preview code can log anything, including values that are cyclic, enormous, or not structured-cloneable. The injected bridge (`src/preview/previewBridge.ts`) converts each argument into a bounded, plain-data tree before posting it:

- `primitive` — string, number, boolean, or null.
- `array` / `object` — with a `truncated` flag.
- `error` — `name`, `message`, optional `stack`.
- `node` — `tagName`, optional `id`/`className`, and a short `preview` string. DOM nodes never cross the boundary as references.
- `function` — name only.
- `circular` — a back-reference that was cut.
- `unsupported` — anything else, tagged by kind.

Bounds, all enforced in the bridge: depth ≤ 6, 100 items or keys per container, and 2000 characters per string. They exist so that logging a cyclic or very large value cannot hang the parent application — a behavior asserted directly in `e2e/console.spec.ts`.

## Main thread ↔ SCSS worker (`src/preview/scssWorkerProtocol.ts`)

`protocol: "glacier-dev-playground-scss-worker"`, `version: 1`. Both directions carry a `buildId`.

- **Request**: `{ protocol, version, buildId, source }`.
- **Response**: `{ …, type: "success", css }` or `{ …, type: "failure", error }`, where `error` is `{ message, line?, column?, sourceExcerpt? }`.

The positional fields are what let an SCSS failure render as an in-editor diagnostic rather than only a console line.

## Main thread ↔ TypeScript worker (`src/preview/tsWorkerProtocol.ts`)

`protocol: "glacier-dev-playground-ts-worker"`, `version: 1`. Both directions carry a `buildId`.

- **Request**: `{ protocol, version, buildId, source, scriptLanguage, executionMode }`. `scriptLanguage` is `javascript | typescript`; `executionMode` is `classic | module`.
- **Response**: `{ protocol, version, buildId, diagnostics, emittedJs, lineMap }`.

There is deliberately no success/failure discriminant, because diagnostics and a successful emit can coexist — an absolute HTTPS import produces a non-blocking warning alongside working output. Outcome is read from the values instead: `emittedJs` is non-null exactly when no diagnostic has `category: "error"`.

`TsDiagnostic.category` separates blocking issues (syntax and type errors, classic-mode `import`/`export` rejection, unresolved bare or relative imports) from non-blocking notices (the "treated as `any`" warning for absolute HTTPS imports). `lineMap` maps emitted JavaScript lines back to source lines so that a runtime error reported by the preview can focus the right line in the editor.

Both worker channels are same-origin module workers. Their validators guard against malformed or stale-version shapes, not against an adversary.
