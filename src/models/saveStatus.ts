/**
 * Persistence save-status contract. Defined now so a later milestone's
 * autosave/storage layer has a stable type to target; not yet driven by any
 * runtime logic because this milestone has no persistence.
 */
export type SaveStatus =
  | "saving"
  | "saved"
  | "save-failed"
  | "storage-unavailable";
