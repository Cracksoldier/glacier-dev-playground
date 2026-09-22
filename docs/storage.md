# Storage

All user data stays on the device. Projects live in IndexedDB; UI preferences live in `localStorage`. Nothing is uploaded anywhere.

## IndexedDB

Database `glacier-dev-playground`, opened through `idb` rather than raw IndexedDB so transactions are promise-based — raw IndexedDB auto-closes a transaction the moment unrelated awaited work yields, which is easy to trip over in an async React codebase.

| Object store | Key | Value |
| --- | --- | --- |
| `projects` | `ProjectId` | A whole `PlaygroundProject` record. |
| `meta` | `string` | `{ key, value }`, holding `activeProjectId` and `appSchemaVersion`. |

The connection registers a `blocking` callback that closes itself when it is holding up a delete or upgrade. Without it, `saveSnapshot`'s clear-then-rewrite and test cleanup via `indexedDB.deleteDatabase` can hang.

### Two independent version numbers

They are deliberately separate and must not be conflated:

- **`DATABASE_VERSION`** (`src/persistence/schema.ts`) — the *structural* version passed to `openDB`. Bump it only when an object store or index is added, removed, or renamed. Currently `1`.
- **`PROJECT_SCHEMA_VERSION`** (`src/models/project.ts`) — the *record shape* version of a single project. Bump it whenever the `PlaygroundProject` shape changes, and add a migration step in the same change. Currently `1`.

### Reading: recovery, not trust

Records read from storage may have been written by a different app version or edited out of band, so `load()` treats every record as `unknown` and passes it through `recoverProjectRecord` (`src/models/projectMigrations.ts`). This is the one documented unchecked-cast boundary in the codebase.

Recovery returns one of three outcomes:

- `ok` — validated, and migrated forward through `PROJECT_MIGRATIONS` if it was written at an older schema version. The migration map is keyed by the version being migrated *away from*, and is empty today because the shape has been version 1 since inception.
- `unsupported-future-version` — the record claims a schema version newer than this build understands.
- `invalid` — the shape failed validation.

Records that are not `ok` are skipped rather than discarded from disk, and counted in `LoadResult.recoveredCount`. A non-zero count surfaces as a persistence notice in the shell, which offers an explicit, confirmed "Reset local data" action. Data is never wiped automatically.

`load()` also checks `meta.appSchemaVersion` before reading any project: if the persisted value is newer than this build's `PROJECT_SCHEMA_VERSION`, it returns `rejectedNewerAppVersion` and loads nothing, rather than partially interpreting data from a future version.

If no valid project survives, the store hydrates with a fresh starter project instead of an empty workspace.

### Writing

Autosave debounces writes by 800 ms after the last change. `Ctrl/Cmd + S` flushes the debounce immediately. `saveSnapshot` clears the `projects` store and rewrites every project plus both meta keys in a single transaction, so a partially-written snapshot is not observable.

`lastPersistedRevision` on the store is what distinguishes "dirty" from "saved", and it advances only on a successful write — a failed save leaves the project dirty and keeps the unload warning armed.

### When IndexedDB is unavailable

Private-browsing modes and blocked-storage settings can make IndexedDB unusable. Rather than failing to boot, the app falls back to `createUnavailableProjectRepository()`: the session works entirely in memory and the shell shows a persistence notice explaining that changes will not survive a reload. This is why IndexedDB is not in the hard `REQUIRED_FEATURES` list in `src/browserSupport.ts`.

## localStorage

Preferences are small, versioned, and independent of project data. Every reader falls back to its defaults on any parse or shape error and never throws.

| Key | Contents | Defaults |
| --- | --- | --- |
| `glacier:editor-preferences:v1` | `{ fontSize, tabWidth, wordWrap, lineNumbers }` | `14`, `2`, `false`, `true` |
| `glacier:shell-preferences:v1` | `{ consoleVisible }` | `true` |
| `glacier:layout-preferences:v1` | `{ activeTab }` — the selected tab in the narrow layout | `"html"` |
| `glacier:workspace-layout:v1` | Panel sizes, written by `react-resizable-panels`' own `useDefaultLayout` | library-managed |

The `:v1` suffix is the migration strategy: a shape change means a new key, and the old value is simply ignored rather than needing a migration path for UI state.
