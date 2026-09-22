import { type RefObject, useId } from "react";
import Popover from "../components/common/Popover";
import type { EditorPreferences } from "../preferences/editorPreferences";
import styles from "./EditorPreferencesPopover.module.css";

const TAB_WIDTH_OPTIONS = [2, 4];
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

export interface EditorPreferencesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  preferences: EditorPreferences;
  onUpdatePreferences: (partial: Partial<EditorPreferences>) => void;
}

function EditorPreferencesPopover({
  isOpen,
  onClose,
  anchorRef,
  preferences,
  onUpdatePreferences,
}: EditorPreferencesPopoverProps) {
  const tabWidthId = useId();

  function stepFontSize(delta: number) {
    const next = Math.min(
      MAX_FONT_SIZE,
      Math.max(MIN_FONT_SIZE, preferences.fontSize + delta),
    );
    onUpdatePreferences({ fontSize: next });
  }

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      anchorRef={anchorRef}
      role="group"
      aria-label="Editor preferences"
      className={styles.popover}
    >
      <div className={styles.row}>
        <span className={styles.label}>Font size</span>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepperButton}
            aria-label="Decrease font size"
            disabled={preferences.fontSize <= MIN_FONT_SIZE}
            onClick={() => stepFontSize(-1)}
          >
            −
          </button>
          <span className={styles.stepperValue}>{preferences.fontSize}px</span>
          <button
            type="button"
            className={styles.stepperButton}
            aria-label="Increase font size"
            disabled={preferences.fontSize >= MAX_FONT_SIZE}
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
          {TAB_WIDTH_OPTIONS.map((width) => (
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
    </Popover>
  );
}

export default EditorPreferencesPopover;
