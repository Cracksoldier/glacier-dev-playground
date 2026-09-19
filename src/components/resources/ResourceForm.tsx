import { type FormEvent, useId, useState } from "react";
import type {
  ExternalResource,
  ExternalResourceType,
  ResourceCrossOrigin,
} from "../../models/resource";
import { validateResourceUrl } from "../../models/resourceUrlValidation";
import styles from "./ResourceForm.module.css";

const RESOURCE_TYPE_OPTIONS: { value: ExternalResourceType; label: string }[] =
  [
    { value: "stylesheet", label: "Stylesheet" },
    { value: "font-stylesheet", label: "Font stylesheet" },
    { value: "script", label: "Script (classic)" },
    { value: "module", label: "Module" },
  ];

const CROSS_ORIGIN_OPTIONS: {
  value: "" | ResourceCrossOrigin;
  label: string;
}[] = [
  { value: "", label: "Not set" },
  { value: "anonymous", label: "anonymous" },
  { value: "use-credentials", label: "use-credentials" },
];

export interface ResourceFormValues {
  name: string;
  url: string;
  type: ExternalResourceType;
  enabled: boolean;
  integrity?: string;
  crossOrigin?: ResourceCrossOrigin;
}

export interface ResourceFormProps {
  formId: string;
  /** `null` when adding a new resource; the resource being edited otherwise. */
  initial: ExternalResource | null;
  onSubmit: (values: ResourceFormValues) => void;
  onCancel: () => void;
}

function ResourceForm({
  formId,
  initial,
  onSubmit,
  onCancel,
}: ResourceFormProps) {
  const nameId = useId();
  const urlId = useId();
  const typeId = useId();
  const integrityId = useId();
  const crossOriginId = useId();

  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [type, setType] = useState<ExternalResourceType>(
    initial?.type ?? "script",
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [integrity, setIntegrity] = useState(initial?.integrity ?? "");
  const [crossOrigin, setCrossOrigin] = useState<"" | ResourceCrossOrigin>(
    initial?.crossOrigin ?? "",
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateResourceUrl(url, import.meta.env.DEV);
    if (!validation.valid) {
      setUrlError(validation.reason);
      setUrlWarning(null);
      return;
    }
    setUrlError(null);
    setUrlWarning(validation.warning ?? null);

    const trimmedUrl = url.trim();
    onSubmit({
      name: name.trim() === "" ? trimmedUrl : name.trim(),
      url: trimmedUrl,
      type,
      enabled,
      integrity: integrity.trim() === "" ? undefined : integrity.trim(),
      crossOrigin: crossOrigin === "" ? undefined : crossOrigin,
    });
  }

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor={nameId} className={styles.label}>
          Name
        </label>
        <input
          id={nameId}
          type="text"
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Bootstrap CSS"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={urlId} className={styles.label}>
          URL
        </label>
        <input
          id={urlId}
          type="text"
          className={styles.input}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setUrlError(null);
          }}
          placeholder="https://example.com/library.min.js"
        />
        {urlError && (
          <p className={styles.errorText} role="alert">
            {urlError}
          </p>
        )}
        {!urlError && urlWarning && (
          <p className={styles.warningText}>{urlWarning}</p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor={typeId} className={styles.label}>
          Type
        </label>
        <select
          id={typeId}
          className={styles.select}
          value={type}
          onChange={(event) =>
            setType(event.target.value as ExternalResourceType)
          }
        >
          {RESOURCE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <details className={styles.advanced}>
        <summary className={styles.advancedSummary}>
          Integrity / cross-origin
        </summary>
        <div className={styles.field}>
          <label htmlFor={integrityId} className={styles.label}>
            Integrity (optional)
          </label>
          <input
            id={integrityId}
            type="text"
            className={styles.input}
            value={integrity}
            onChange={(event) => setIntegrity(event.target.value)}
            placeholder="sha384-..."
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={crossOriginId} className={styles.label}>
            Cross-origin (optional)
          </label>
          <select
            id={crossOriginId}
            className={styles.select}
            value={crossOrigin}
            onChange={(event) =>
              setCrossOrigin(event.target.value as "" | ResourceCrossOrigin)
            }
          >
            {CROSS_ORIGIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </details>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="submit" className={styles.saveButton}>
          {initial ? "Save" : "Add resource"}
        </button>
      </div>
    </form>
  );
}

export default ResourceForm;
