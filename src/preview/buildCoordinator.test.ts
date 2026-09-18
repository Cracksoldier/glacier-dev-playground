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

    const first = coordinator.beginBuild(project);
    const second = coordinator.beginBuild(project);

    expect(first.compilationId).not.toBe(second.compilationId);
    expect(first.executionId).not.toBe(second.executionId);
  });

  it("marks only the most recent execution ID as not stale", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const first = coordinator.beginBuild(project);
    expect(coordinator.isStale(first.executionId)).toBe(false);

    const second = coordinator.beginBuild(project);
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

    const build = coordinator.beginBuild(project);
    const document = coordinator.buildDocument(build.source, build.executionId);

    expect(document).toContain(project.source.html);
  });

  it("is not affected by mutating the source project after beginBuild returns", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const build = coordinator.beginBuild(project);
    project.source.html = "<p>mutated after the fact</p>";
    const document = coordinator.buildDocument(build.source, build.executionId);

    expect(document).not.toContain("mutated after the fact");
  });

  it("embeds the build's own execution ID into the bridge script", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const build = coordinator.beginBuild(project);
    const document = coordinator.buildDocument(build.source, build.executionId);

    expect(document).toContain(build.executionId);
  });

  it("buildDocument reflects a resolvedSource that differs from the snapshot (e.g. compiled CSS substituted in)", () => {
    const coordinator = createPreviewBuildCoordinator();
    const project = makeProject();

    const build = coordinator.beginBuild(project);
    const resolvedSource = {
      ...build.source,
      stylesheet: ".compiled { color: red; }",
    };
    const document = coordinator.buildDocument(
      resolvedSource,
      build.executionId,
    );

    expect(document).toContain(".compiled { color: red; }");
  });
});
