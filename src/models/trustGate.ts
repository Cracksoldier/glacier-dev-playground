import type { PlaygroundProject } from "./project";

export function requiresTrustApproval(project: PlaygroundProject): boolean {
  return (
    !project.trusted &&
    project.resources.some(
      (resource) =>
        resource.enabled &&
        (resource.type === "script" || resource.type === "module"),
    )
  );
}
