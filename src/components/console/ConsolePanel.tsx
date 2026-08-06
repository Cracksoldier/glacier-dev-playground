import { useId } from "react";
import { useConsoleVisibility } from "../../app/useConsoleVisibility";
import { ChevronIcon } from "../common/icons";
import styles from "./ConsolePanel.module.css";

function ConsolePanel() {
  const { isConsoleVisible, toggleConsoleVisible } = useConsoleVisibility();
  const contentId = useId();

  return (
    <section className={styles.console} aria-label="Console">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isConsoleVisible}
        aria-controls={contentId}
        onClick={toggleConsoleVisible}
      >
        <ChevronIcon
          className={
            isConsoleVisible
              ? `${styles.chevron} ${styles.chevronOpen}`
              : styles.chevron
          }
        />
        Console
      </button>
      {isConsoleVisible && (
        <div id={contentId} className={styles.body}>
          The console output arrives in a later milestone.
        </div>
      )}
    </section>
  );
}

export default ConsolePanel;
