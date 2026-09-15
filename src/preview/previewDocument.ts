import type { ProjectSource } from "../models/project";
import { escapeClosingSequence } from "./closingTagEscape";

/**
 * Reserved insertion point for the M6 console bridge bootstrap script. M5
 * only reserves the position in document order; no bridge behavior exists
 * yet (console rendering is explicitly out of scope for this milestone).
 */
const PREVIEW_BRIDGE_MARKER = "<!-- glacier-preview-bridge -->";

/**
 * Assembles the full HTML document rendered inside the sandboxed preview
 * iframe. `stylesheetLanguage`/`scriptLanguage` are intentionally not
 * branched on here — per the milestone's "raw CSS and JavaScript for the
 * initial implementation" scope, SCSS/TypeScript source is injected
 * verbatim as-is. It will fail to parse/execute correctly in the browser
 * until M7/M8 insert a compile stage in front of this builder; that's
 * expected, not a bug.
 */
export function buildPreviewDocument(source: ProjectSource): string {
  const scriptTagOpen =
    source.executionMode === "module" ? '<script type="module">' : "<script>";

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    source.headContent,
    "<style>",
    escapeClosingSequence(source.stylesheet, "style"),
    "</style>",
    "</head>",
    "<body>",
    source.html,
    PREVIEW_BRIDGE_MARKER,
    scriptTagOpen,
    escapeClosingSequence(source.script, "script"),
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}
