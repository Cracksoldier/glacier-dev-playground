import { useState } from "react";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { WarningIcon } from "../components/common/icons";
import { useProjectStore } from "../store/ProjectStoreContext";
import styles from "./PersistenceNotice.module.css";

function PersistenceNotice() {
  const { saveStatus, persistenceNotice, actions } = useProjectStore();
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  if (saveStatus === "storage-unavailable") {
    return (
      <div className={styles.notice} role="alert">
        <WarningIcon />
        <p className={styles.message}>
          Local storage is unavailable. Your work won't be saved between
          sessions.
        </p>
      </div>
    );
  }

  if (!persistenceNotice) return null;

  const { recoveredCount, rejectedNewerAppVersion } = persistenceNotice;
  const message = rejectedNewerAppVersion
    ? "Saved data was written by a newer version of this app and could not be loaded."
    : `${recoveredCount} saved project${recoveredCount === 1 ? "" : "s"} could not be read and ${recoveredCount === 1 ? "was" : "were"} skipped.`;

  return (
    <>
      <div className={styles.notice} role="alert">
        <WarningIcon />
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => setIsConfirmingReset(true)}
          >
            Reset local data
          </button>
          <button
            type="button"
            className={styles.dismissButton}
            onClick={actions.dismissPersistenceNotice}
          >
            Dismiss
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isConfirmingReset}
        title="Reset local data"
        description="This permanently deletes all locally saved projects and starts over with a fresh project. This cannot be undone."
        confirmLabel="Reset local data"
        destructive
        onConfirm={() => {
          setIsConfirmingReset(false);
          void actions.resetLocalData();
        }}
        onCancel={() => setIsConfirmingReset(false)}
      />
    </>
  );
}

export default PersistenceNotice;
