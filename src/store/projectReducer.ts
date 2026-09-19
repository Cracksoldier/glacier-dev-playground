import type { ImportedProjectDraft } from "../import-export/importValidation";
import {
  nowIso,
  type PlaygroundProject,
  PROJECT_SCHEMA_VERSION,
  type ProjectId,
  type ProjectSettings,
  type ProjectSource,
} from "../models/project";
import { normalizeProjectTitle } from "../models/projectTitle";
import type { ExternalResource } from "../models/resource";
import {
  DEFAULT_STARTER_TEMPLATE_ID,
  PROJECT_TEMPLATES,
  type TemplateId,
} from "../models/templates";

export interface ProjectStoreState {
  projects: PlaygroundProject[];
  activeProjectId: ProjectId;
  /** Incremented on every content-mutating action. Navigation (switch) does not bump it. */
  revision: number;
  /** Revision as of the last successful save. Never changes in this milestone — there is no save operation yet. */
  lastPersistedRevision: number;
}

export type ProjectStoreAction =
  | {
      type: "project/create";
      payload: { templateId?: TemplateId; title?: string };
    }
  | { type: "project/rename"; payload: { projectId: ProjectId; title: string } }
  | { type: "project/duplicate"; payload: { projectId: ProjectId } }
  | { type: "project/delete"; payload: { projectId: ProjectId } }
  | { type: "project/switch"; payload: { projectId: ProjectId } }
  | {
      type: "project/resetFromTemplate";
      payload: { projectId: ProjectId; templateId: TemplateId };
    }
  | {
      type: "project/updateSource";
      payload: { projectId: ProjectId; source: Partial<ProjectSource> };
    }
  | {
      type: "project/updateSettings";
      payload: { projectId: ProjectId; settings: Partial<ProjectSettings> };
    }
  | {
      type: "project/updateResources";
      payload: { projectId: ProjectId; resources: ExternalResource[] };
    }
  | {
      type: "project/setTrusted";
      payload: { projectId: ProjectId; trusted: boolean };
    }
  | {
      type: "project/import";
      payload:
        | { mode: "add"; draft: ImportedProjectDraft }
        | {
            mode: "replace";
            targetProjectId: ProjectId;
            draft: ImportedProjectDraft;
          };
    }
  | {
      type: "project/hydrate";
      payload: { projects: PlaygroundProject[]; activeProjectId: ProjectId };
    }
  | { type: "project/markSaved"; payload: { revision: number } };

export function createInitialProjectStoreState(): ProjectStoreState {
  const starter = PROJECT_TEMPLATES[DEFAULT_STARTER_TEMPLATE_ID].create();
  return {
    projects: [starter],
    activeProjectId: starter.id,
    revision: 0,
    lastPersistedRevision: 0,
  };
}

function createStarterProject(): PlaygroundProject {
  return PROJECT_TEMPLATES[DEFAULT_STARTER_TEMPLATE_ID].create();
}

function cloneProject(project: PlaygroundProject): PlaygroundProject {
  return structuredClone(project);
}

/**
 * Mints fresh resource ids for an imported draft's resources, avoiding
 * collisions with any existing project's resources (the file's own ids are
 * untrusted/arbitrary, same reasoning as regenerating the project id itself).
 */
function regenerateResourceIds(
  resources: ExternalResource[],
): ExternalResource[] {
  return resources.map((resource) => ({
    ...resource,
    id: crypto.randomUUID(),
  }));
}

export function projectReducer(
  state: ProjectStoreState,
  action: ProjectStoreAction,
): ProjectStoreState {
  switch (action.type) {
    case "project/create": {
      const templateId =
        action.payload.templateId ?? DEFAULT_STARTER_TEMPLATE_ID;
      const created = PROJECT_TEMPLATES[templateId].create();
      const project: PlaygroundProject = action.payload.title
        ? { ...created, title: normalizeProjectTitle(action.payload.title) }
        : created;

      return {
        ...state,
        projects: [...state.projects, project],
        activeProjectId: project.id,
        revision: state.revision + 1,
      };
    }

    case "project/rename": {
      const { projectId, title } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const target = state.projects[index];
      const projects = [...state.projects];
      projects[index] = {
        ...target,
        title: normalizeProjectTitle(title),
        updatedAt: new Date().toISOString(),
      };

      return { ...state, projects, revision: state.revision + 1 };
    }

    case "project/duplicate": {
      const { projectId } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const source = state.projects[index];
      const timestamp = new Date().toISOString();
      const duplicate: PlaygroundProject = {
        ...cloneProject(source),
        id: crypto.randomUUID(),
        title: normalizeProjectTitle(`${source.title} Copy`),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const projects = [...state.projects];
      projects.splice(index + 1, 0, duplicate);

      return {
        ...state,
        projects,
        activeProjectId: duplicate.id,
        revision: state.revision + 1,
      };
    }

    case "project/delete": {
      const { projectId } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const remaining = state.projects.filter((p) => p.id !== projectId);

      if (remaining.length === 0) {
        const starter = createStarterProject();
        return {
          ...state,
          projects: [starter],
          activeProjectId: starter.id,
          revision: state.revision + 1,
        };
      }

      let activeProjectId = state.activeProjectId;
      if (activeProjectId === projectId) {
        const fallback = state.projects[index + 1] ?? state.projects[index - 1];
        activeProjectId = fallback.id;
      }

      return {
        ...state,
        projects: remaining,
        activeProjectId,
        revision: state.revision + 1,
      };
    }

    case "project/switch": {
      const { projectId } = action.payload;
      const exists = state.projects.some((p) => p.id === projectId);
      if (!exists) return state;

      return { ...state, activeProjectId: projectId };
    }

    case "project/resetFromTemplate": {
      const { projectId, templateId } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const target = state.projects[index];
      const fresh = PROJECT_TEMPLATES[templateId].create();
      const projects = [...state.projects];
      projects[index] = {
        ...fresh,
        id: target.id,
        title: target.title,
        createdAt: target.createdAt,
        updatedAt: new Date().toISOString(),
      };

      return { ...state, projects, revision: state.revision + 1 };
    }

    case "project/updateSource": {
      const { projectId, source } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const target = state.projects[index];
      const projects = [...state.projects];
      projects[index] = {
        ...target,
        source: { ...target.source, ...source },
        updatedAt: new Date().toISOString(),
      };

      return { ...state, projects, revision: state.revision + 1 };
    }

    case "project/updateSettings": {
      const { projectId, settings } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const target = state.projects[index];
      const projects = [...state.projects];
      projects[index] = {
        ...target,
        settings: { ...target.settings, ...settings },
        updatedAt: new Date().toISOString(),
      };

      return { ...state, projects, revision: state.revision + 1 };
    }

    case "project/updateResources": {
      const { projectId, resources } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const target = state.projects[index];
      const projects = [...state.projects];
      projects[index] = {
        ...target,
        resources,
        updatedAt: new Date().toISOString(),
      };

      return { ...state, projects, revision: state.revision + 1 };
    }

    case "project/setTrusted": {
      const { projectId, trusted } = action.payload;
      const index = state.projects.findIndex((p) => p.id === projectId);
      if (index === -1) return state;

      const target = state.projects[index];
      const projects = [...state.projects];
      projects[index] = {
        ...target,
        trusted,
        updatedAt: new Date().toISOString(),
      };

      return { ...state, projects, revision: state.revision + 1 };
    }

    case "project/import": {
      const { payload } = action;
      const timestamp = nowIso();

      if (payload.mode === "add") {
        const { draft } = payload;
        const project: PlaygroundProject = {
          schemaVersion: PROJECT_SCHEMA_VERSION,
          id: crypto.randomUUID(),
          title: draft.title,
          createdAt: timestamp,
          updatedAt: timestamp,
          trusted: false,
          source: draft.source,
          resources: regenerateResourceIds(draft.resources),
          settings: draft.settings,
        };

        return {
          ...state,
          projects: [...state.projects, project],
          activeProjectId: project.id,
          revision: state.revision + 1,
        };
      }

      const { targetProjectId, draft } = payload;
      const index = state.projects.findIndex((p) => p.id === targetProjectId);
      if (index === -1) return state;

      const target = state.projects[index];
      const projects = [...state.projects];
      projects[index] = {
        ...target,
        title: draft.title,
        updatedAt: timestamp,
        trusted: false,
        source: draft.source,
        resources: regenerateResourceIds(draft.resources),
        settings: draft.settings,
      };

      return {
        ...state,
        projects,
        activeProjectId: targetProjectId,
        revision: state.revision + 1,
      };
    }

    case "project/hydrate": {
      const { projects, activeProjectId } = action.payload;

      if (projects.length === 0) {
        const starter = createStarterProject();
        return {
          ...state,
          projects: [starter],
          activeProjectId: starter.id,
          revision: 0,
          lastPersistedRevision: 0,
        };
      }

      const resolvedActiveProjectId = projects.some(
        (p) => p.id === activeProjectId,
      )
        ? activeProjectId
        : projects[0].id;

      return {
        ...state,
        projects,
        activeProjectId: resolvedActiveProjectId,
        revision: 0,
        lastPersistedRevision: 0,
      };
    }

    case "project/markSaved": {
      return {
        ...state,
        lastPersistedRevision: Math.max(
          state.lastPersistedRevision,
          action.payload.revision,
        ),
      };
    }

    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}
