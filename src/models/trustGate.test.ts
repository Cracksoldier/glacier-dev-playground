import { describe, expect, it } from "vitest";
import type { PlaygroundProject } from "./project";
import type { ExternalResource } from "./resource";
import { requiresTrustApproval } from "./trustGate";

function testResource(
  overrides: Partial<ExternalResource> = {},
): ExternalResource {
  return {
    id: "res-1",
    name: "Lib",
    url: "https://example.com/lib.js",
    type: "script",
    enabled: true,
    order: 0,
    ...overrides,
  };
}

function testProject(
  overrides: Partial<PlaygroundProject> = {},
): PlaygroundProject {
  return {
    schemaVersion: 1,
    id: "project-id",
    title: "My Project",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    trusted: true,
    source: {
      html: "",
      stylesheet: "",
      stylesheetLanguage: "css",
      script: "",
      scriptLanguage: "javascript",
      executionMode: "classic",
      headContent: "",
    },
    resources: [],
    settings: { autoRun: true, previewDebounceMs: 400, preserveConsole: false },
    ...overrides,
  };
}

describe("requiresTrustApproval", () => {
  it("is false for a trusted project with enabled script resources", () => {
    const project = testProject({
      trusted: true,
      resources: [testResource({ type: "script", enabled: true })],
    });

    expect(requiresTrustApproval(project)).toBe(false);
  });

  it("is false for an untrusted project with no script/module resources", () => {
    const project = testProject({
      trusted: false,
      resources: [testResource({ type: "stylesheet", enabled: true })],
    });

    expect(requiresTrustApproval(project)).toBe(false);
  });

  it("is true for an untrusted project with an enabled script resource", () => {
    const project = testProject({
      trusted: false,
      resources: [testResource({ type: "script", enabled: true })],
    });

    expect(requiresTrustApproval(project)).toBe(true);
  });

  it("is true for an untrusted project with an enabled module resource", () => {
    const project = testProject({
      trusted: false,
      resources: [testResource({ type: "module", enabled: true })],
    });

    expect(requiresTrustApproval(project)).toBe(true);
  });

  it("is false for an untrusted project whose only script resource is disabled", () => {
    const project = testProject({
      trusted: false,
      resources: [testResource({ type: "script", enabled: false })],
    });

    expect(requiresTrustApproval(project)).toBe(false);
  });

  it("is false for an untrusted project with no resources at all", () => {
    const project = testProject({ trusted: false, resources: [] });

    expect(requiresTrustApproval(project)).toBe(false);
  });
});
