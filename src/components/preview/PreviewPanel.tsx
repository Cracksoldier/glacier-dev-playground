import type { Ref } from "react";
import { WarningIcon } from "../../components/common/icons";
import { hasRelativeAssetUrls } from "../../preview/relativeUrlWarning";
import { useProjectStore } from "../../store/ProjectStoreContext";
import PreviewFrame, { type PreviewRunHandle } from "./PreviewFrame";
import styles from "./PreviewPanel.module.css";

interface PreviewPanelProps {
  ref?: Ref<PreviewRunHandle>;
}

function PreviewPanel({ ref }: PreviewPanelProps) {
  const { activeProject } = useProjectStore();
  const showRelativeUrlWarning = hasRelativeAssetUrls(activeProject.source);

  return (
    <section className={styles.panel} aria-label="Preview">
      <div className={styles.header}>Preview</div>
      {showRelativeUrlWarning && (
        <div className={styles.warning} role="status">
          <WarningIcon />
          <p className={styles.warningMessage}>
            Relative asset URLs aren't portable. Use absolute HTTPS, CDN, or
            data URLs instead.
          </p>
        </div>
      )}
      <PreviewFrame key={activeProject.id} project={activeProject} ref={ref} />
    </section>
  );
}

export default PreviewPanel;
