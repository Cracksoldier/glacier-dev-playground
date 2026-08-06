import { PROJECT_TEMPLATES, type TemplateId } from "../../models/templates";
import styles from "./TemplatePicker.module.css";

export interface TemplatePickerProps {
  name: string;
  value: TemplateId;
  onChange: (templateId: TemplateId) => void;
}

function TemplatePicker({ name, value, onChange }: TemplatePickerProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Template</legend>
      <div className={styles.options}>
        {Object.values(PROJECT_TEMPLATES).map((template) => (
          <label key={template.id} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={template.id}
              checked={value === template.id}
              onChange={() => onChange(template.id)}
            />
            {template.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default TemplatePicker;
