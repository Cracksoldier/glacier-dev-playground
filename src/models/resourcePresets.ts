import type { ExternalResource, ExternalResourceType } from "./resource";
import { nextOrderForType } from "./resourceOrdering";

export type ResourcePresetId =
  | "bootstrap"
  | "alpinejs"
  | "lodash"
  | "font-awesome"
  | "normalize-css"
  | "google-fonts-inter";

export interface ResourcePreset {
  id: ResourcePresetId;
  label: string;
  description: string;
  /**
   * Produces fresh, independently-editable {@link ExternalResource} entries.
   * `existing` is the project's current resource list, used only to compute
   * each new entry's {@link ExternalResource.order} (appended after any
   * existing resource of the same type) — the preset itself holds no
   * mutable state and produces new ids on every call.
   */
  build: (existing: ExternalResource[]) => ExternalResource[];
}

function buildResource(
  contextResources: ExternalResource[],
  type: ExternalResourceType,
  name: string,
  url: string,
): ExternalResource {
  return {
    id: crypto.randomUUID(),
    name,
    url,
    type,
    enabled: true,
    order: nextOrderForType(contextResources, type),
  };
}

export const RESOURCE_PRESETS: Record<ResourcePresetId, ResourcePreset> = {
  bootstrap: {
    id: "bootstrap",
    label: "Bootstrap",
    description: "Bootstrap 5 CSS and the bundled JS (includes Popper).",
    build: (existing) => {
      const css = buildResource(
        existing,
        "stylesheet",
        "Bootstrap CSS",
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
      );
      const js = buildResource(
        [...existing, css],
        "script",
        "Bootstrap JS Bundle",
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
      );
      return [css, js];
    },
  },
  alpinejs: {
    id: "alpinejs",
    label: "Alpine.js",
    description: "A lightweight, self-initializing JavaScript framework.",
    build: (existing) => [
      buildResource(
        existing,
        "script",
        "Alpine.js",
        "https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js",
      ),
    ],
  },
  lodash: {
    id: "lodash",
    label: "Lodash",
    description: "A utility library for common JavaScript data operations.",
    build: (existing) => [
      buildResource(
        existing,
        "script",
        "Lodash",
        "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
      ),
    ],
  },
  "font-awesome": {
    id: "font-awesome",
    label: "Font Awesome Free",
    description: "Icon font and CSS toolkit.",
    build: (existing) => [
      buildResource(
        existing,
        "font-stylesheet",
        "Font Awesome Free",
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css",
      ),
    ],
  },
  "normalize-css": {
    id: "normalize-css",
    label: "Normalize.css",
    description: "Makes browsers render elements more consistently.",
    build: (existing) => [
      buildResource(
        existing,
        "stylesheet",
        "Normalize.css",
        "https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css",
      ),
    ],
  },
  "google-fonts-inter": {
    id: "google-fonts-inter",
    label: "Google Fonts: Inter",
    description:
      'Loads the "Inter" typeface (weights 400/500/700) from Google Fonts.',
    build: (existing) => [
      buildResource(
        existing,
        "font-stylesheet",
        "Google Fonts: Inter",
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
      ),
    ],
  },
};
