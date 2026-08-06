import styles from "./PreviewPanelPlaceholder.module.css";

function PreviewPanelPlaceholder() {
  return (
    <section className={styles.panel} aria-label="Preview">
      <div className={styles.header}>Preview</div>
      <div className={styles.body}>
        The live preview arrives in a later milestone.
      </div>
    </section>
  );
}

export default PreviewPanelPlaceholder;
