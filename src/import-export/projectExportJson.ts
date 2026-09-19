import {
  type PlaygroundProject,
  PROJECT_SCHEMA_VERSION,
} from "../models/project";

/**
 * The portable on-disk shape of a project export. Deliberately omits `id`
 * (local-only identity; re-import always mints a fresh one) and `trusted`
 * (must never round-trip as a claim of safety — the importer forces it
 * `false` regardless, so omitting it here is the more honest artifact).
 */
export interface ProjectExportDocument {
  schemaVersion: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: PlaygroundProject["source"];
  resources: PlaygroundProject["resources"];
  settings: PlaygroundProject["settings"];
}

export function serializeProjectForExport(project: PlaygroundProject): string {
  const doc: ProjectExportDocument = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    title: project.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    source: project.source,
    resources: project.resources,
    settings: project.settings,
  };

  return JSON.stringify(doc, null, 2);
}
