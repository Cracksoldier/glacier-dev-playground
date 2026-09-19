import { useState } from "react";
import {
  RESOURCE_PRESETS,
  type ResourcePresetId,
} from "../../models/resourcePresets";
import styles from "./ResourcePresetsSection.module.css";

export interface ResourcePresetsSectionProps {
  onApply: (presetIds: ResourcePresetId[]) => void;
}

function ResourcePresetsSection({ onApply }: ResourcePresetsSectionProps) {
  const [selected, setSelected] = useState<Set<ResourcePresetId>>(new Set());

  function toggle(id: ResourcePresetId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleApply() {
    if (selected.size === 0) return;
    onApply([...selected]);
    setSelected(new Set());
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Presets</legend>
      <div className={styles.options}>
        {Object.values(RESOURCE_PRESETS).map((preset) => (
          <label key={preset.id} className={styles.option}>
            <input
              type="checkbox"
              checked={selected.has(preset.id)}
              onChange={() => toggle(preset.id)}
            />
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>{preset.label}</span>
              <span className={styles.optionDescription}>
                {preset.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className={styles.applyButton}
        disabled={selected.size === 0}
        onClick={handleApply}
      >
        Add selected
      </button>
    </fieldset>
  );
}

export default ResourcePresetsSection;
