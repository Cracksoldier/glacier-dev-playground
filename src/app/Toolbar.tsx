import { type ReactElement, useId } from "react";
import GlacierMark from "../components/common/GlacierMark";
import {
  AutoRunIcon,
  ExportIcon,
  type IconProps,
  ImportIcon,
  NewProjectIcon,
  ProjectSwitcherIcon,
  ResetIcon,
  ResourcesIcon,
  RunIcon,
  SaveStatusIcon,
  SettingsIcon,
} from "../components/common/icons";
import styles from "./Toolbar.module.css";

interface ToolbarAction {
  name: string;
  Icon: (props: IconProps) => ReactElement;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { name: "Switch project", Icon: ProjectSwitcherIcon },
  { name: "New project", Icon: NewProjectIcon },
  { name: "Run", Icon: RunIcon },
  { name: "Auto-run", Icon: AutoRunIcon },
  { name: "Resources", Icon: ResourcesIcon },
  { name: "Import", Icon: ImportIcon },
  { name: "Export", Icon: ExportIcon },
  { name: "Reset", Icon: ResetIcon },
  { name: "Settings", Icon: SettingsIcon },
];

function Toolbar() {
  const disabledHintId = useId();

  return (
    <div className={styles.toolbar}>
      <div className={styles.brand}>
        <GlacierMark size={28} />
        <div className={styles.wordmark}>
          <h1 className={styles.title}>GLACIER</h1>
          <p className={styles.subtitle}>DEV PLAYGROUND</p>
        </div>
      </div>
      <div className={styles.actions}>
        {TOOLBAR_ACTIONS.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            className={styles.button}
            aria-disabled="true"
            aria-describedby={disabledHintId}
            aria-label={name}
            title={name}
          >
            <Icon />
          </button>
        ))}
        <span id={disabledHintId} hidden>
          Coming in a later milestone
        </span>
      </div>
      <div className={styles.status} role="status">
        <SaveStatusIcon />
        Saved
      </div>
    </div>
  );
}

export default Toolbar;
