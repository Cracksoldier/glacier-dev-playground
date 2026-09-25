/**
 * The four save states the toolbar shows (spec §9.2). Derived in
 * `ProjectStoreContext.tsx` from the autosave status, the store's dirty
 * state (a pending save counts as "saving"), and hydration (unavailable or
 * blocked storage both show as "storage-unavailable").
 */
export type SaveStatus =
  | "saving"
  | "saved"
  | "save-failed"
  | "storage-unavailable";
