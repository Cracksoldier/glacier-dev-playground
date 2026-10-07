import { useId } from "react";
import Dialog from "../components/common/Dialog";
import {
  EDITOR_TAB_WIDTH_OPTIONS,
  type EditorPreferences,
  MAX_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
} from "../preferences/editorPreferences";
import styles from "./EditorPreferencesDialog.module.css";

export interface EditorPreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: EditorPreferences;
  onUpdatePreferences: (partial: Partial<EditorPreferences>) => void;
}

function EditorPreferencesDialog({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}: EditorPreferencesDialogProps) {
  const titleId = useId();
  const tabWidthId = useId();

  function stepFontSize(delta: number) {
    const next = Math.min(
      MAX_EDITOR_FONT_SIZE,
      Math.max(MIN_EDITOR_FONT_SIZE, preferences.fontSize + delta),
    );
    onUpdatePreferences({ fontSize: next });
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} titleId={titleId}>
      <h2 id={titleId} className={styles.title}>
        Editor preferences
      </h2>
      <div className={styles.controls}>
        <div className={styles.row}>
          <span className={styles.label}>Font size</span>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="Decrease font size"
              disabled={preferences.fontSize <= MIN_EDITOR_FONT_SIZE}
              onClick={() => stepFontSize(-1)}
            >
              −
            </button>
            <span className={styles.stepperValue}>
              {preferences.fontSize}px
            </span>
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="Increase font size"
              disabled={preferences.fontSize >= MAX_EDITOR_FONT_SIZE}
              onClick={() => stepFontSize(1)}
            >
              +
            </button>
          </div>
        </div>
        <div className={styles.row}>
          <label htmlFor={tabWidthId} className={styles.label}>
            Tab width
          </label>
          <select
            id={tabWidthId}
            className={styles.select}
            value={preferences.tabWidth}
            onChange={(event) =>
              onUpdatePreferences({ tabWidth: Number(event.target.value) })
            }
          >
            {EDITOR_TAB_WIDTH_OPTIONS.map((width) => (
              <option key={width} value={width}>
                {width}
              </option>
            ))}
          </select>
        </div>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={preferences.wordWrap}
            onChange={(event) =>
              onUpdatePreferences({ wordWrap: event.target.checked })
            }
          />
          Word wrap
        </label>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={preferences.lineNumbers}
            onChange={(event) =>
              onUpdatePreferences({ lineNumbers: event.target.checked })
            }
          />
          Line numbers
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

export default EditorPreferencesDialog;
