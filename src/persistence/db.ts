/**
 * Uses `idb` (Jake Archibald) instead of raw IndexedDB: raw IndexedDB is
 * callback/event-based and has a well-known transaction-auto-close footgun
 * when awaiting unrelated work between requests in the same transaction.
 * `idb` gives promise-based stores/transactions and a typed `DBSchema` for
 * the `upgrade` callback, at ~1.2 kB min+gzip — small enough to keep this
 * app's minimal-dependency footprint while directly fulfilling the "typed
 * operations, isolate IndexedDB details" persistence requirement.
 */
import { type IDBPDatabase, openDB } from "idb";
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  type GlacierDBSchema,
  META_STORE,
  PROJECTS_STORE,
} from "./schema";

export function openDatabase(
  name: string = DATABASE_NAME,
): Promise<IDBPDatabase<GlacierDBSchema>> {
  return openDB<GlacierDBSchema>(name, DATABASE_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
      // if (oldVersion < 2) { ... next structural migration ... }
    },
    // Without this, an open connection would indefinitely block a
    // `deleteDatabase()` call (used by test cleanup, and by "reset local
    // data") or a future version upgrade in another tab.
    blocking(_currentVersion, _blockedVersion, event) {
      const db = event.target as IDBDatabase | null;
      db?.close();
    },
  });
}
