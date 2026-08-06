import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type {
  PlaygroundProject,
  ProjectId,
  ProjectSettings,
  ProjectSource,
} from "../models/project";
import type { TemplateId } from "../models/templates";
import {
  createInitialProjectStoreState,
  projectReducer,
} from "./projectReducer";
import { getActiveProject, isProjectStoreDirty } from "./projectSelectors";

interface ProjectStoreActions {
  createProject: (templateId?: TemplateId, title?: string) => void;
  renameProject: (projectId: ProjectId, title: string) => void;
  duplicateProject: (projectId: ProjectId) => void;
  deleteProject: (projectId: ProjectId) => void;
  switchProject: (projectId: ProjectId) => void;
  resetProjectFromTemplate: (
    projectId: ProjectId,
    templateId: TemplateId,
  ) => void;
  updateProjectSource: (
    projectId: ProjectId,
    source: Partial<ProjectSource>,
  ) => void;
  updateProjectSettings: (
    projectId: ProjectId,
    settings: Partial<ProjectSettings>,
  ) => void;
}

interface ProjectStoreContextValue {
  projects: PlaygroundProject[];
  activeProject: PlaygroundProject;
  isDirty: boolean;
  actions: ProjectStoreActions;
}

const ProjectStoreContext = createContext<ProjectStoreContextValue | undefined>(
  undefined,
);

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    projectReducer,
    undefined,
    createInitialProjectStoreState,
  );

  const actions = useMemo<ProjectStoreActions>(
    () => ({
      createProject: (templateId, title) =>
        dispatch({ type: "project/create", payload: { templateId, title } }),
      renameProject: (projectId, title) =>
        dispatch({ type: "project/rename", payload: { projectId, title } }),
      duplicateProject: (projectId) =>
        dispatch({ type: "project/duplicate", payload: { projectId } }),
      deleteProject: (projectId) =>
        dispatch({ type: "project/delete", payload: { projectId } }),
      switchProject: (projectId) =>
        dispatch({ type: "project/switch", payload: { projectId } }),
      resetProjectFromTemplate: (projectId, templateId) =>
        dispatch({
          type: "project/resetFromTemplate",
          payload: { projectId, templateId },
        }),
      updateProjectSource: (projectId, source) =>
        dispatch({
          type: "project/updateSource",
          payload: { projectId, source },
        }),
      updateProjectSettings: (projectId, settings) =>
        dispatch({
          type: "project/updateSettings",
          payload: { projectId, settings },
        }),
    }),
    [],
  );

  const value = useMemo<ProjectStoreContextValue>(
    () => ({
      projects: state.projects,
      activeProject: getActiveProject(state),
      isDirty: isProjectStoreDirty(state),
      actions,
    }),
    [state, actions],
  );

  return (
    <ProjectStoreContext.Provider value={value}>
      {children}
    </ProjectStoreContext.Provider>
  );
}

export function useProjectStore(): ProjectStoreContextValue {
  const context = useContext(ProjectStoreContext);
  if (!context) {
    throw new Error(
      "useProjectStore must be used within a ProjectStoreProvider.",
    );
  }
  return context;
}
