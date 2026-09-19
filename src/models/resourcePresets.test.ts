import { describe, expect, it } from "vitest";
import type { ExternalResource } from "./resource";
import { RESOURCE_PRESETS } from "./resourcePresets";

describe("RESOURCE_PRESETS", () => {
  it("builds at least one resource for every preset", () => {
    for (const preset of Object.values(RESOURCE_PRESETS)) {
      const built = preset.build([]);
      expect(built.length).toBeGreaterThan(0);
      for (const resource of built) {
        expect(resource.enabled).toBe(true);
        expect(resource.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("produces fresh ids on every call, with no shared mutable state", () => {
    const first = RESOURCE_PRESETS.bootstrap.build([]);
    const second = RESOURCE_PRESETS.bootstrap.build([]);

    expect(first.map((r) => r.id)).not.toEqual(second.map((r) => r.id));
    expect(first[0]).not.toBe(second[0]);
  });

  it("orders a multi-resource preset's entries independently per type", () => {
    const [css, js] = RESOURCE_PRESETS.bootstrap.build([]);
    expect(css.type).toBe("stylesheet");
    expect(css.order).toBe(0);
    expect(js.type).toBe("script");
    expect(js.order).toBe(0);
  });

  it("appends after existing resources of the same type", () => {
    const existing: ExternalResource[] = [
      {
        id: "existing-1",
        name: "Existing stylesheet",
        url: "https://example.com/existing.css",
        type: "stylesheet",
        enabled: true,
        order: 3,
      },
    ];

    const [css] = RESOURCE_PRESETS["normalize-css"].build(existing);
    expect(css.order).toBe(4);
  });

  it("applying a preset produces ordinary resources with no special preset marker", () => {
    const built = RESOURCE_PRESETS.lodash.build([]);
    for (const resource of built) {
      expect(Object.keys(resource).sort()).toEqual(
        ["enabled", "id", "name", "order", "type", "url"].sort(),
      );
    }
  });
});
