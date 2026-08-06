import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
  useState,
} from "react";
import type {
  PlaygroundProject,
  ProjectId,
  ProjectSettings,
  ProjectSource,
} from "../models/project";
import type { SaveStatus } from "../models/saveStatus";
import type { TemplateId } from "../models/templates";
import type { ProjectRepository } from "../persistence/projectRepository";
import { createIndexedDbProjectRepository } from "../persistence/projectRepository";
import {
  createInitialProjectStoreState,
  projectReducer,
} from "./projectReducer";
import { getActiveProject, isProjectStoreDirty } from "./projectSelectors";
import { useAutosave } from "./useAutosave";
import { useBeforeUnloadWarning } from "./useBeforeUnloadWarning";
import type { PersistenceNotice } from "./useProjectHydration";
import { useProjectHydration } from "./useProjectHydration";
import { useSaveShortcut } from "./useSaveShortcut";

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
  resetLocalData: () => Promise<void>;
  saveNow: () => void;
  dismissPersistenceNotice: () => void;
}

interface ProjectStoreContextValue {
  projects: PlaygroundProject[];
  activeProject: PlaygroundProject;
  isDirty: boolean;
  saveStatus: SaveStatus;
  persistenceNotice: PersistenceNotice | null;
  actions: ProjectStoreActions;
}

const ProjectStoreContext = createContext<ProjectStoreContextValue | undefined>(
  undefined,
);

export function ProjectStoreProvider({
  children,
  repository,
}: {
  children: ReactNode;
  /** Injectable for tests; defaults to the real IndexedDB-backed repository. */
  repository?: ProjectRepository;
}) {
  const [state, dispatch] = useReducer(
    projectReducer,
    undefined,
    createInitialProjectStoreState,
  );

  const [resolvedRepository] = useState<ProjectRepository>(
    () => repository ?? createIndexedDbProjectRepository(),
  );

  const hydration = useProjectHydration(state, dispatch, resolvedRepository);
  const autosave = useAutosave(
    state,
    dispatch,
    resolvedRepository,
    hydration.status === "ready",
  );
  const saveStatus: SaveStatus =
    hydration.status === "unavailable"
      ? "storage-unavailable"
      : autosave.saveStatus;

  useSaveShortcut(autosave.saveNow);
  useBeforeUnloadWarning(saveStatus);

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
      resetLocalData: hydration.resetLocalData,
      saveNow: autosave.saveNow,
      dismissPersistenceNotice: hydration.dismissNotice,
    }),
    [hydration.resetLocalData, hydration.dismissNotice, autosave.saveNow],
  );

  const value = useMemo<ProjectStoreContextValue>(
    () => ({
      projects: state.projects,
      activeProject: getActiveProject(state),
      isDirty: isProjectStoreDirty(state),
      saveStatus,
      persistenceNotice: hydration.notice,
      actions,
    }),
    [state, saveStatus, hydration.notice, actions],
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
