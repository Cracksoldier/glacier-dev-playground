import type { ProjectSource } from "../models/project";
import type { ExternalResource } from "../models/resource";
import { buildZipIndexHtmlDocument } from "./standaloneHtmlDocument";

/**
 * Builds the in-memory file tree for a ZIP export: always the runnable root
 * files (`index.html`, `style.css`, `script.js`), plus the original
 * (uncompiled) SCSS/TypeScript source under `src/` when the project was
 * authored in that language — never the compiled output a second time.
 */
export function buildZipFileEntries(
  resolvedSource: ProjectSource,
  originalSource: ProjectSource,
  resources: ExternalResource[],
): Record<string, Uint8Array> {
  const encoder = new TextEncoder();
  const entries: Record<string, Uint8Array> = {
    "index.html": encoder.encode(
      buildZipIndexHtmlDocument(resolvedSource, resources),
    ),
    "style.css": encoder.encode(resolvedSource.stylesheet),
    "script.js": encoder.encode(resolvedSource.script),
  };

  if (originalSource.stylesheetLanguage === "scss") {
    entries["src/style.scss"] = encoder.encode(originalSource.stylesheet);
  }

  if (originalSource.scriptLanguage === "typescript") {
    entries["src/script.ts"] = encoder.encode(originalSource.script);
  }

  return entries;
}
