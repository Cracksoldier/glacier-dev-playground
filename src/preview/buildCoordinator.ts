import { createCompilationId, createExecutionId } from "../models/identifiers";
import type { PlaygroundProject } from "../models/project";
import { buildPreviewDocument } from "./previewDocument";

export interface PreviewBuild {
  compilationId: string;
  executionId: string;
  document: string;
}

export interface PreviewBuildCoordinator {
  /**
   * Captures an immutable snapshot of `project`, assigns fresh
   * compilation/execution IDs, and builds the preview document. This call
   * also atomically advances the coordinator's notion of the latest
   * execution — every ID issued before this call is stale from this point
   * on, which is what makes {@link PreviewBuildCoordinator.isStale} work.
   */
  startBuild(project: PlaygroundProject): PreviewBuild;
  /** True once a later build has been started than the one identified by `executionId`. */
  isStale(executionId: string): boolean;
}

/**
 * One coordinator instance tracks a single preview's run history. Callers
 * (e.g. `PreviewFrame`) create one instance per mounted preview and discard
 * it on unmount rather than sharing across projects/panels.
 */
export function createPreviewBuildCoordinator(): PreviewBuildCoordinator {
  let latestExecutionId: string | null = null;

  return {
    startBuild(project) {
      const snapshot = structuredClone(project);
      const compilationId = createCompilationId();
      const executionId = createExecutionId();
      latestExecutionId = executionId;

      return {
        compilationId,
        executionId,
        document: buildPreviewDocument(snapshot.source, executionId),
      };
    },
    isStale(executionId) {
      return executionId !== latestExecutionId;
    },
  };
}
