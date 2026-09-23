# Storage

All user data stays on the device. Projects live in IndexedDB; UI preferences live in `localStorage`. Nothing is uploaded anywhere.

## IndexedDB

Database `glacier-dev-playground`, opened through `idb` rather than raw IndexedDB so transactions are promise-based — raw IndexedDB auto-closes a transaction the moment unrelated awaited work yields, which is easy to trip over in an async React codebase.

| Object store | Key | Value |
| --- | --- | --- |
| `projects` | `ProjectId` | A whole `PlaygroundProject` record. |
| `meta` | `string` | `{ key, value }`, holding `activeProjectId` and `appSchemaVersion`. |

Each repository keeps one shared connection rather than opening one per call. The connection registers a `blocking` callback that closes itself when it is holding up a delete or upgrade — without it, `saveSnapshot` and test cleanup via `indexedDB.deleteDatabase` can hang — and the repository then reopens on its next call.

### Two independent version numbers

They are deliberately separate and must not be conflated:

- **`DATABASE_VERSION`** (`src/persistence/schema.ts`) — the *structural* version passed to `openDB`. Bump it only when an object store or index is added, removed, or renamed. Currently `1`.
- **`PROJECT_SCHEMA_VERSION`** (`src/models/project.ts`) — the *record shape* version of a single project. Bump it whenever the `PlaygroundProject` shape changes, and add a migration step in the same change. Currently `2` (v2 made `trusted` required).

### Reading: recovery, not trust

Records read from storage may have been written by a different app version or edited out of band, so `load()` treats every record as `unknown` and passes it through `recoverProjectRecord` (`src/models/projectMigrations.ts`). This is the one documented unchecked-cast boundary in the codebase.

Recovery returns one of three outcomes:

- `ok` — migrated forward through `PROJECT_MIGRATIONS` if it was written at an older schema version, then validated field by field, nested source, settings, and resources included (`src/models/projectValidation.ts`, shared with import). The migration map is keyed by the version being migrated *away from*. Its one step, v1 → v2, sets `trusted: true` on records that predate the field and keeps an explicit value; from v2 on, a missing or non-boolean `trusted` makes the record invalid rather than silently trusted.
- `unsupported-future-version` — the record claims a schema version newer than this build understands.
- `invalid` — the shape failed validation.

Records that are not `ok` are skipped rather than discarded from disk, and counted in `LoadResult.recoveredCount`. The repository remembers their keys, and later saves leave them in place. A non-zero count surfaces as a persistence notice in the shell, which offers an explicit, confirmed "Reset local data" action. Data is never wiped automatically.

`load()` also checks `meta.appSchemaVersion` before reading any project: if the persisted value is newer than this build's `PROJECT_SCHEMA_VERSION`, it returns `rejectedNewerAppVersion` and loads nothing, rather than partially interpreting data from a future version.

If nothing has ever been persisted, the store starts with a fresh starter project and saves it. If data exists but none of it can be loaded — it was written by a newer app version, or every record is unreadable — the workspace still opens with a starter project, but saving is **blocked**: the toolbar shows "Storage unavailable", and a notice that can't be dismissed explains that changes won't be saved until the user resets local data. This keeps the unloadable data intact instead of overwriting it.

If the user edits the starter project before the load finishes, the loaded projects are merged in ahead of the edited one rather than either side being dropped.

### Writing

Autosave debounces writes by 800 ms after the last change. `Ctrl/Cmd + S` flushes the debounce immediately. `saveSnapshot` deletes stored projects that are missing from the snapshot (except unreadable records, see above), then rewrites every project plus both meta keys in a single transaction, so a partially-written snapshot is not observable.

`lastPersistedRevision` on the store is what distinguishes "dirty" from "saved", and it advances only on a successful write. Switching the active project also counts as a change, because the active project id is persisted so the last active project reopens on startup. While the store is dirty — including the debounce window before a save starts — the toolbar shows "Saving…" and the unload warning is armed; a failed save leaves the project dirty and keeps the warning armed.

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
