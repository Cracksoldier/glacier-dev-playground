import { useId, useState } from "react";
import { ChevronIcon } from "../common/icons";
import styles from "./ConsolePanel.module.css";

function ConsolePanel() {
  const [isOpen, setIsOpen] = useState(true);
  const contentId = useId();

  return (
    <section className={styles.console} aria-label="Console">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <ChevronIcon
          className={
            isOpen ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron
          }
        />
        Console
      </button>
      {isOpen && (
        <div id={contentId} className={styles.body}>
          The console output arrives in a later milestone.
        </div>
      )}
    </section>
  );
}

export default ConsolePanel;
