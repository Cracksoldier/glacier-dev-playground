import { describe, expect, it } from "vitest";
import type { ExternalResource } from "./resource";
import { sortResourcesByOrder } from "./resource";

function makeResource(
  overrides: Partial<ExternalResource> & { id: string; order: number },
): ExternalResource {
  return {
    name: overrides.id,
    url: `https://example.com/${overrides.id}`,
    type: "stylesheet",
    enabled: true,
    ...overrides,
  };
}

describe("sortResourcesByOrder", () => {
  it("sorts ascending by order", () => {
    const resources = [
      makeResource({ id: "c", order: 2 }),
      makeResource({ id: "a", order: 0 }),
      makeResource({ id: "b", order: 1 }),
    ];

    expect(sortResourcesByOrder(resources).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("keeps relative position stable for equal order values", () => {
    const resources = [
      makeResource({ id: "first", order: 0 }),
      makeResource({ id: "second", order: 0 }),
      makeResource({ id: "third", order: 0 }),
    ];

    expect(sortResourcesByOrder(resources).map((r) => r.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("does not mutate the input array", () => {
    const resources = [
      makeResource({ id: "b", order: 1 }),
      makeResource({ id: "a", order: 0 }),
    ];
    const original = [...resources];

    sortResourcesByOrder(resources);

    expect(resources).toEqual(original);
  });
});
