import type {
  ExternalResource,
  ExternalResourceType,
  ResourceId,
} from "./resource";

/** The next free {@link ExternalResource.order} value among resources of `type`. */
export function nextOrderForType(
  resources: ExternalResource[],
  type: ExternalResourceType,
): number {
  const ordersForType = resources
    .filter((r) => r.type === type)
    .map((r) => r.order);
  return ordersForType.length === 0 ? 0 : Math.max(...ordersForType) + 1;
}

/**
 * Swaps `id`'s {@link ExternalResource.order} with its neighbor in the given
 * direction, among resources sharing its `type` (order is only meaningful
 * within a type — see {@link ExternalResource.order}). Returns `resources`
 * unchanged (same reference) if `id` is missing or already at that end.
 */
export function moveResource(
  resources: ExternalResource[],
  id: ResourceId,
  direction: "up" | "down",
): ExternalResource[] {
  const target = resources.find((r) => r.id === id);
  if (!target) return resources;

  const siblings = resources
    .filter((r) => r.type === target.type)
    .sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((r) => r.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return resources;

  const other = siblings[swapIndex];
  return resources.map((r) => {
    if (r.id === target.id) return { ...r, order: other.order };
    if (r.id === other.id) return { ...r, order: target.order };
    return r;
  });
}

export function removeResource(
  resources: ExternalResource[],
  id: ResourceId,
): ExternalResource[] {
  return resources.filter((r) => r.id !== id);
}

export function setResourceEnabled(
  resources: ExternalResource[],
  id: ResourceId,
  enabled: boolean,
): ExternalResource[] {
  return resources.map((r) => (r.id === id ? { ...r, enabled } : r));
}

/**
 * The `order` value a resource being added or edited via a form should get:
 * unchanged if editing without a type change (`editing.type === type`),
 * otherwise the next free slot for `type` — computed with `editing` itself
 * excluded from consideration, so editing a resource's type never collides
 * with its own prior order value in the old type's sequence.
 */
export function orderForSubmittedResource(
  resources: ExternalResource[],
  editing: ExternalResource | null,
  type: ExternalResourceType,
): number {
  if (editing && editing.type === type) return editing.order;
  const withoutEditing = editing
    ? resources.filter((r) => r.id !== editing.id)
    : resources;
  return nextOrderForType(withoutEditing, type);
}

/** Inserts `resource` if its id is new, otherwise replaces the existing entry in place. */
export function upsertResource(
  resources: ExternalResource[],
  resource: ExternalResource,
): ExternalResource[] {
  const index = resources.findIndex((r) => r.id === resource.id);
  if (index === -1) return [...resources, resource];
  const next = [...resources];
  next[index] = resource;
  return next;
}

const TYPE_DISPLAY_ORDER: ExternalResourceType[] = [
  "stylesheet",
  "font-stylesheet",
  "script",
  "module",
];

/** Resources grouped and sorted for display: by type (load-order-ish), then by order within each type. */
export function sortResourcesForDisplay(
  resources: ExternalResource[],
): ExternalResource[] {
  return [...resources].sort((a, b) => {
    const typeDiff =
      TYPE_DISPLAY_ORDER.indexOf(a.type) - TYPE_DISPLAY_ORDER.indexOf(b.type);
    if (typeDiff !== 0) return typeDiff;
    return a.order - b.order;
  });
}
