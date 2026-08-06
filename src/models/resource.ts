export type ResourceId = string;

export type ExternalResourceType =
  | "stylesheet"
  | "font-stylesheet"
  | "script"
  | "module";

export type ResourceCrossOrigin = "anonymous" | "use-credentials";

export interface ExternalResource {
  id: ResourceId;
  name: string;
  url: string;
  type: ExternalResourceType;
  enabled: boolean;
  /** Position among resources of the same {@link type}; lower loads first. */
  order: number;
  integrity?: string;
  crossOrigin?: ResourceCrossOrigin;
}

/** Stable sort by {@link ExternalResource.order}, so equal-order ties keep their relative position. */
export function sortResourcesByOrder(
  resources: ExternalResource[],
): ExternalResource[] {
  return [...resources].sort((a, b) => a.order - b.order);
}
