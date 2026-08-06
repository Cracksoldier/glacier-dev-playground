import type { PlaygroundProject } from "../models/project";
import type { ProjectStoreState } from "./projectReducer";

export function getActiveProject(state: ProjectStoreState): PlaygroundProject {
  const active = state.projects.find((p) => p.id === state.activeProjectId);
  if (!active) {
    throw new Error(
      "Project store invariant violated: active project not found in project list.",
    );
  }
  return active;
}

export function isProjectStoreDirty(state: ProjectStoreState): boolean {
  return state.revision !== state.lastPersistedRevision;
}
