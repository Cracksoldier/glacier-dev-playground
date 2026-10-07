import styles from "./AppFooter.module.css";

const REPOSITORY_URL = "https://github.com/Cracksoldier/glacier-dev-playground";

function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <p className={styles.copyright}>© {year} Cracksoldier</p>
      <a
        className={styles.link}
        href={REPOSITORY_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub repository
      </a>
    </footer>
  );
}

export default AppFooter;
