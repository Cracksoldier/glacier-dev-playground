import { WarningIcon } from "./icons";
import styles from "./SecretsWarning.module.css";

export interface SecretsWarningProps {
  children: string;
}

/**
 * Static advisory, not an alert: it describes a standing property of frontend
 * code rather than reporting an event, so it must not interrupt a screen
 * reader mid-task.
 */
function SecretsWarning({ children }: SecretsWarningProps) {
  return (
    <div className={styles.warning}>
      <WarningIcon />
      <p className={styles.message}>{children}</p>
    </div>
  );
}

export default SecretsWarning;
