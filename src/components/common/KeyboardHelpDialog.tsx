import { useId } from "react";
import Dialog from "./Dialog";
import styles from "./KeyboardHelpDialog.module.css";

export interface KeyboardHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ["Ctrl", "Enter"], description: "Run the preview" },
  { keys: ["Ctrl", "S"], description: "Save the project" },
  { keys: ["Alt", "1"], description: "Focus the HTML editor" },
  { keys: ["Alt", "2"], description: "Focus the Stylesheet editor" },
  { keys: ["Alt", "3"], description: "Focus the Script editor" },
  { keys: ["Alt", "4"], description: "Focus the preview" },
  { keys: ["Escape"], description: "Close the open dialog or popover" },
  {
    keys: ["← / →"],
    description: "Resize panels, when a separator is focused",
  },
];

function KeyboardHelpDialog({ isOpen, onClose }: KeyboardHelpDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <h2 id={titleId} className={styles.title}>
        Keyboard shortcuts
      </h2>
      <p id={descriptionId} className={styles.description}>
        On macOS, use Cmd in place of Ctrl.
      </p>
      <table className={styles.table}>
        <tbody>
          {SHORTCUTS.map((shortcut) => (
            <tr key={shortcut.description}>
              <td className={styles.keysCell}>
                {shortcut.keys.map((key) => (
                  <kbd key={key} className={styles.kbd}>
                    {key}
                  </kbd>
                ))}
              </td>
              <td className={styles.descriptionCell}>{shortcut.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.actions}>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

export default KeyboardHelpDialog;
