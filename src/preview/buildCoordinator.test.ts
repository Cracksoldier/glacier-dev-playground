import { describe, expect, it } from "vitest";
import { PROJECT_TEMPLATES } from "../models/templates";
import { createPreviewBuildCoordinator } from "./buildCoordinator";

function makeProject() {
  return PROJECT_TEMPLATES["basic-html"].create();
}

describe("createPreviewBuildCoordinator", () => {
  it("assigns unique compilation and execution IDs per build", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const first = coordinator.startBuild(project);
    const second = coordinator.startBuild(project);

    expect(first.compilationId).not.toBe(second.compilationId);
    expect(first.executionId).not.toBe(second.executionId);
  });

  it("marks only the most recent execution ID as not stale", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const first = coordinator.startBuild(project);
    expect(coordinator.isStale(first.executionId)).toBe(false);

    const second = coordinator.startBuild(project);
    expect(coordinator.isStale(first.executionId)).toBe(true);
    expect(coordinator.isStale(second.executionId)).toBe(false);
  });

  it("treats an unknown execution ID as stale", () => {
    const coordinator = createPreviewBuildCoordinator();
    expect(coordinator.isStale("never-issued")).toBe(true);
  });

  it("builds a document reflecting the project's source at build time", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const build = coordinator.startBuild(project);

    expect(build.document).toContain(project.source.html);
  });

  it("is not affected by mutating the source project after startBuild returns", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const build = coordinator.startBuild(project);
    project.source.html = "<p>mutated after the fact</p>";

    expect(build.document).not.toContain("mutated after the fact");
  });

  it("embeds the build's own execution ID into the bridge script", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const build = coordinator.startBuild(project);

    expect(build.document).toContain(build.executionId);
  });
});
