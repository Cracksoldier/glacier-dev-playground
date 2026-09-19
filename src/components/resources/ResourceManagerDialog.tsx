import { useId, useState } from "react";
import type { ExternalResource, ResourceId } from "../../models/resource";
import {
  moveResource,
  orderForSubmittedResource,
  removeResource,
  setResourceEnabled,
  sortResourcesForDisplay,
  upsertResource,
} from "../../models/resourceOrdering";
import {
  RESOURCE_PRESETS,
  type ResourcePresetId,
} from "../../models/resourcePresets";
import { useProjectStore } from "../../store/ProjectStoreContext";
import ConfirmDialog from "../common/ConfirmDialog";
import Dialog from "../common/Dialog";
import ResourceForm, { type ResourceFormValues } from "./ResourceForm";
import styles from "./ResourceManagerDialog.module.css";
import ResourcePresetsSection from "./ResourcePresetsSection";

export interface ResourceManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; resourceId: ResourceId };

const TYPE_LABEL: Record<ExternalResource["type"], string> = {
  stylesheet: "Stylesheet",
  "font-stylesheet": "Font stylesheet",
  script: "Script",
  module: "Module",
};

function ResourceManagerDialog({
  isOpen,
  onClose,
}: ResourceManagerDialogProps) {
  const titleId = useId();
  const formId = useId();
  const headContentId = useId();
  const { activeProject, actions } = useProjectStore();
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [pendingDeleteId, setPendingDeleteId] = useState<ResourceId | null>(
    null,
  );

  const resources = activeProject.resources;
  const sorted = sortResourcesForDisplay(resources);
  const editingResource =
    formState.mode === "edit"
      ? (resources.find((r) => r.id === formState.resourceId) ?? null)
      : null;
  const pendingDeleteResource =
    resources.find((r) => r.id === pendingDeleteId) ?? null;

  function updateResources(next: ExternalResource[]) {
    actions.updateProjectResources(activeProject.id, next);
  }

  function handleFormSubmit(values: ResourceFormValues) {
    const resource: ExternalResource = {
      id: editingResource?.id ?? crypto.randomUUID(),
      name: values.name,
      url: values.url,
      type: values.type,
      enabled: values.enabled,
      order: orderForSubmittedResource(resources, editingResource, values.type),
      ...(values.integrity ? { integrity: values.integrity } : {}),
      ...(values.crossOrigin ? { crossOrigin: values.crossOrigin } : {}),
    };
    updateResources(upsertResource(resources, resource));
    setFormState({ mode: "closed" });
  }

  function handleApplyPresets(presetIds: ResourcePresetId[]) {
    let next = resources;
    for (const presetId of presetIds) {
      next = [...next, ...RESOURCE_PRESETS[presetId].build(next)];
    }
    updateResources(next);
  }

  function handleClose() {
    setFormState({ mode: "closed" });
    onClose();
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        titleId={titleId}
        className={styles.dialog}
      >
        <h2 id={titleId} className={styles.title}>
          Resources
        </h2>

        <ResourcePresetsSection onApply={handleApplyPresets} />

        <ul className={styles.list}>
          {sorted.map((resource) => {
            const isEditingThis =
              formState.mode === "edit" && formState.resourceId === resource.id;

            if (isEditingThis) {
              return (
                <li key={resource.id} className={styles.formRow}>
                  <ResourceForm
                    formId={formId}
                    initial={resource}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setFormState({ mode: "closed" })}
                  />
                </li>
              );
            }

            return (
              <li key={resource.id} className={styles.row}>
                <label className={styles.enabledToggle}>
                  <input
                    type="checkbox"
                    checked={resource.enabled}
                    aria-label={`${resource.enabled ? "Disable" : "Enable"} ${resource.name}`}
                    onChange={(event) =>
                      updateResources(
                        setResourceEnabled(
                          resources,
                          resource.id,
                          event.target.checked,
                        ),
                      )
                    }
                  />
                </label>
                <div className={styles.rowInfo}>
                  <span className={styles.rowName}>{resource.name}</span>
                  <span className={styles.rowMeta}>
                    <span className={styles.typeBadge}>
                      {TYPE_LABEL[resource.type]}
                    </span>
                    <span className={styles.rowUrl} title={resource.url}>
                      {resource.url}
                    </span>
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.rowActionButton}
                    aria-label={`Move ${resource.name} up`}
                    title="Move up"
                    onClick={() =>
                      updateResources(
                        moveResource(resources, resource.id, "up"),
                      )
                    }
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className={styles.rowActionButton}
                    aria-label={`Move ${resource.name} down`}
                    title="Move down"
                    onClick={() =>
                      updateResources(
                        moveResource(resources, resource.id, "down"),
                      )
                    }
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className={styles.rowActionButton}
                    aria-label={`Edit ${resource.name}`}
                    title="Edit"
                    onClick={() =>
                      setFormState({ mode: "edit", resourceId: resource.id })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.rowActionButton}
                    aria-label={`Delete ${resource.name}`}
                    title="Delete"
                    onClick={() => setPendingDeleteId(resource.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {formState.mode === "add" ? (
          <ResourceForm
            formId={formId}
            initial={null}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormState({ mode: "closed" })}
          />
        ) : (
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setFormState({ mode: "add" })}
          >
            Add resource
          </button>
        )}

        <fieldset className={styles.advancedFieldset}>
          <legend className={styles.advancedLegend}>Advanced</legend>
          <label htmlFor={headContentId} className={styles.headContentLabel}>
            Additional {"<head>"} markup
          </label>
          <textarea
            id={headContentId}
            className={styles.headContentTextarea}
            value={activeProject.source.headContent}
            onChange={(event) =>
              actions.updateProjectSource(activeProject.id, {
                headContent: event.target.value,
              })
            }
            placeholder='<meta name="description" content="...">'
            rows={4}
          />
        </fieldset>
      </Dialog>

      {pendingDeleteResource && (
        <ConfirmDialog
          isOpen={true}
          title="Delete resource"
          description={`Delete "${pendingDeleteResource.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            updateResources(
              removeResource(resources, pendingDeleteResource.id),
            );
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
}

export default ResourceManagerDialog;
