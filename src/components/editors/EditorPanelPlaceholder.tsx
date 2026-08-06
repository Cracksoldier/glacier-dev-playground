import styles from "./EditorPanelPlaceholder.module.css";

type EditorLanguage = "html" | "css" | "javascript";

const LANGUAGE_LABELS: Record<EditorLanguage, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
};

interface EditorPanelPlaceholderProps {
  language: EditorLanguage;
}

function EditorPanelPlaceholder({ language }: EditorPanelPlaceholderProps) {
  const label = LANGUAGE_LABELS[language];

  return (
    <section className={styles.panel} aria-label={`${label} editor`}>
      <div className={styles.header}>{label}</div>
      <div className={styles.body}>
        The {label} editor arrives in a later milestone.
      </div>
    </section>
  );
}

export default EditorPanelPlaceholder;
