import { describe, expect, it } from "vitest";
import type { ExternalResource } from "./resource";
import {
  moveResource,
  nextOrderForType,
  orderForSubmittedResource,
  removeResource,
  setResourceEnabled,
  sortResourcesForDisplay,
  upsertResource,
} from "./resourceOrdering";

function resource(overrides: Partial<ExternalResource> = {}): ExternalResource {
  return {
    id: "id",
    name: "Resource",
    url: "https://example.com/a.js",
    type: "script",
    enabled: true,
    order: 0,
    ...overrides,
  };
}

describe("nextOrderForType", () => {
  it("returns 0 when there are no resources of that type", () => {
    expect(nextOrderForType([], "script")).toBe(0);
  });

  it("returns one past the max order for that type", () => {
    const resources = [
      resource({ id: "a", type: "script", order: 0 }),
      resource({ id: "b", type: "script", order: 2 }),
      resource({ id: "c", type: "stylesheet", order: 5 }),
    ];
    expect(nextOrderForType(resources, "script")).toBe(3);
    expect(nextOrderForType(resources, "stylesheet")).toBe(6);
    expect(nextOrderForType(resources, "module")).toBe(0);
  });
});

describe("orderForSubmittedResource", () => {
  it("returns the next free order for a new resource", () => {
    const resources = [resource({ id: "a", type: "script", order: 0 })];
    expect(orderForSubmittedResource(resources, null, "script")).toBe(1);
    expect(orderForSubmittedResource(resources, null, "stylesheet")).toBe(0);
  });

  it("keeps the existing order when editing without a type change", () => {
    const editing = resource({ id: "a", type: "script", order: 3 });
    const resources = [editing];
    expect(orderForSubmittedResource(resources, editing, "script")).toBe(3);
  });

  it("recomputes order, excluding itself, when the type changes", () => {
    const editing = resource({ id: "a", type: "script", order: 0 });
    const resources = [
      editing,
      resource({ id: "b", type: "stylesheet", order: 0 }),
    ];
    expect(orderForSubmittedResource(resources, editing, "stylesheet")).toBe(1);
  });
});

describe("moveResource", () => {
  const resources = [
    resource({ id: "a", type: "script", order: 0 }),
    resource({ id: "b", type: "script", order: 1 }),
    resource({ id: "c", type: "script", order: 2 }),
  ];

  it("swaps order with the previous sibling of the same type when moving up", () => {
    const next = moveResource(resources, "b", "up");
    expect(next.find((r) => r.id === "a")?.order).toBe(1);
    expect(next.find((r) => r.id === "b")?.order).toBe(0);
    expect(next.find((r) => r.id === "c")?.order).toBe(2);
  });

  it("swaps order with the next sibling of the same type when moving down", () => {
    const next = moveResource(resources, "b", "down");
    expect(next.find((r) => r.id === "b")?.order).toBe(2);
    expect(next.find((r) => r.id === "c")?.order).toBe(1);
  });

  it("is a no-op when already at the top", () => {
    const next = moveResource(resources, "a", "up");
    expect(next).toBe(resources);
  });

  it("is a no-op when already at the bottom", () => {
    const next = moveResource(resources, "c", "down");
    expect(next).toBe(resources);
  });

  it("is a no-op for an unknown id", () => {
    const next = moveResource(resources, "missing", "up");
    expect(next).toBe(resources);
  });

  it("only considers siblings of the same type", () => {
    const mixed = [
      resource({ id: "css1", type: "stylesheet", order: 0 }),
      resource({ id: "js1", type: "script", order: 0 }),
    ];
    expect(moveResource(mixed, "js1", "up")).toBe(mixed);
  });
});

describe("removeResource", () => {
  it("filters out the matching resource", () => {
    const resources = [resource({ id: "a" }), resource({ id: "b" })];
    expect(removeResource(resources, "a")).toEqual([resource({ id: "b" })]);
  });
});

describe("setResourceEnabled", () => {
  it("flips the enabled flag for the matching resource only", () => {
    const resources = [
      resource({ id: "a", enabled: true }),
      resource({ id: "b", enabled: true }),
    ];
    const next = setResourceEnabled(resources, "a", false);
    expect(next.find((r) => r.id === "a")?.enabled).toBe(false);
    expect(next.find((r) => r.id === "b")?.enabled).toBe(true);
  });
});

describe("upsertResource", () => {
  it("appends a resource with a new id", () => {
    const resources = [resource({ id: "a" })];
    const next = upsertResource(resources, resource({ id: "b" }));
    expect(next.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("replaces an existing resource in place", () => {
    const resources = [resource({ id: "a", name: "Old" })];
    const next = upsertResource(resources, resource({ id: "a", name: "New" }));
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe("New");
  });
});

describe("sortResourcesForDisplay", () => {
  it("groups by type in load order, then by order within type", () => {
    const resources = [
      resource({ id: "js1", type: "script", order: 1 }),
      resource({ id: "css1", type: "stylesheet", order: 0 }),
      resource({ id: "mod1", type: "module", order: 0 }),
      resource({ id: "js0", type: "script", order: 0 }),
      resource({ id: "font1", type: "font-stylesheet", order: 0 }),
    ];

    expect(sortResourcesForDisplay(resources).map((r) => r.id)).toEqual([
      "css1",
      "font1",
      "js0",
      "js1",
      "mod1",
    ]);
  });
});
