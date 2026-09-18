import { createCompilationId, createExecutionId } from "../models/identifiers";
import type { PlaygroundProject, ProjectSource } from "../models/project";
import { buildPreviewDocument } from "./previewDocument";

export interface PreviewBuild {
  compilationId: string;
  executionId: string;
  source: ProjectSource;
}

export interface PreviewBuildCoordinator {
  /**
   * Captures an immutable snapshot of `project`'s source, assigns fresh
   * compilation/execution IDs, and atomically advances the coordinator's
   * notion of the latest execution — every ID issued before this call is
   * stale from this point on, which is what makes
   * {@link PreviewBuildCoordinator.isStale} work. Does not build the
   * document itself: for SCSS-mode projects, the caller (`PreviewFrame`)
   * inserts an async SCSS compile step between this call and
   * {@link PreviewBuildCoordinator.buildDocument}, substituting compiled
   * CSS into the source it eventually passes to `buildDocument`.
   */
  beginBuild(project: PlaygroundProject): PreviewBuild;
  /**
   * Builds the preview document HTML for `resolvedSource` (the build's
   * source, with any compiled CSS already substituted in by the caller).
   */
  buildDocument(resolvedSource: ProjectSource, executionId: string): string;
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
    beginBuild(project) {
      const snapshot = structuredClone(project);
      const compilationId = createCompilationId();
      const executionId = createExecutionId();
      latestExecutionId = executionId;

      return {
        compilationId,
        executionId,
        source: snapshot.source,
      };
    },
    buildDocument(resolvedSource, executionId) {
      return buildPreviewDocument(resolvedSource, executionId);
    },
    isStale(executionId) {
      return executionId !== latestExecutionId;
    },
  };
}
