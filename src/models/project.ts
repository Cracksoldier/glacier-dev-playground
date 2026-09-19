import type { ExternalResource } from "./resource";

/**
 * Version of the {@link PlaygroundProject} shape. Bump this and add a
 * migration step in a later milestone whenever the shape changes.
 */
export const PROJECT_SCHEMA_VERSION = 1;

export type ProjectId = string;

/** Preprocessor used to compile the project's stylesheet source. */
export type StylesheetLanguage = "css" | "scss";

/** Language used to author the project's script source. */
export type ScriptLanguage = "javascript" | "typescript";

/** How the compiled script is loaded into the preview document. */
export type ExecutionMode = "classic" | "module";

export interface ProjectSource {
  /** Raw HTML body markup, before preview assembly. */
  html: string;
  /** Raw stylesheet source, in the language given by {@link stylesheetLanguage}. */
  stylesheet: string;
  stylesheetLanguage: StylesheetLanguage;
  /** Raw script source, in the language given by {@link scriptLanguage}. */
  script: string;
  scriptLanguage: ScriptLanguage;
  executionMode: ExecutionMode;
  /** User-authored markup injected verbatim into the generated document's `<head>`. */
  headContent: string;
}

export interface ProjectSettings {
  autoRun: boolean;
  previewDebounceMs: number;
  preserveConsole: boolean;
}

export interface PlaygroundProject {
  schemaVersion: number;
  id: ProjectId;
  title: string;
  /** ISO 8601 timestamp, set once at creation. */
  createdAt: string;
  /** ISO 8601 timestamp, refreshed on every content mutation. */
  updatedAt: string;
  source: ProjectSource;
  resources: ExternalResource[];
  settings: ProjectSettings;
  /**
   * Whether this project's script is allowed to execute without an
   * approval prompt. Every template/creation path in this milestone sets
   * this to `true`; only M10's future import flow will ever construct a
   * project with `false`. M9 does not build any enforcement gate on this
   * field — it exists so M10 can wire one in without a schema change.
   */
  trusted: boolean;
}

export function nowIso(): string {
  return new Date().toISOString();
}
