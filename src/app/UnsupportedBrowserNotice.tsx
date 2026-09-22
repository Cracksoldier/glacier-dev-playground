import { WarningIcon } from "../components/common/icons";
import styles from "./UnsupportedBrowserNotice.module.css";

interface UnsupportedBrowserNoticeProps {
  missingFeatures: string[];
}

function UnsupportedBrowserNotice({
  missingFeatures,
}: UnsupportedBrowserNoticeProps) {
  return (
    <div className={styles.screen} role="alert">
      <WarningIcon size={32} className={styles.icon} />
      <h1 className={styles.title}>This browser can't run the playground</h1>
      <p className={styles.message}>
        Glacier DEV Playground needs browser features this browser doesn't
        provide. Try a current version of Chrome, Edge, Firefox, or Safari.
      </p>
      <h2 className={styles.missingHeading}>Missing</h2>
      <ul className={styles.missingList}>
        {missingFeatures.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </div>
  );
}

export default UnsupportedBrowserNotice;
