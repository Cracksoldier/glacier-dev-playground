import type { ProjectSource } from "../models/project";
import type { ExternalResource } from "../models/resource";
import { sortResourcesByOrder } from "../models/resource";
import { escapeClosingSequence } from "../preview/closingTagEscape";
import { escapeHtmlAttribute } from "../preview/htmlAttributeEscape";

/** A static `<link rel="stylesheet">` tag for a `"stylesheet"`/`"font-stylesheet"` resource. */
function stylesheetLinkSegment(resource: ExternalResource): string {
  const attributes = [
    `rel="stylesheet"`,
    `href="${escapeHtmlAttribute(resource.url)}"`,
  ];
  if (resource.integrity) {
    attributes.push(`integrity="${escapeHtmlAttribute(resource.integrity)}"`);
  }
  if (resource.crossOrigin) {
    attributes.push(
      `crossorigin="${escapeHtmlAttribute(resource.crossOrigin)}"`,
    );
  }
  return `<link ${attributes.join(" ")}>`;
}

/** A real, executing `<script src="...">` (or `type="module"` variant) tag for a `"script"`/`"module"` resource. */
function resourceScriptTagSegment(resource: ExternalResource): string {
  const attributes = [`src="${escapeHtmlAttribute(resource.url)}"`];
  if (resource.type === "module") {
    attributes.unshift(`type="module"`);
  }
  if (resource.integrity) {
    attributes.push(`integrity="${escapeHtmlAttribute(resource.integrity)}"`);
  }
  if (resource.crossOrigin) {
    attributes.push(
      `crossorigin="${escapeHtmlAttribute(resource.crossOrigin)}"`,
    );
  }
  return `<script ${attributes.join(" ")}></script>`;
}

interface DocumentOptions {
  /** How the user's own compiled stylesheet is included. */
  stylesheet: "inline" | "linked";
  /** How the user's own compiled script is included. */
  script: "inline" | "linked";
}

function buildDocument(
  source: ProjectSource,
  resources: ExternalResource[],
  options: DocumentOptions,
): string {
  const enabledResources = sortResourcesByOrder(
    resources.filter((resource) => resource.enabled),
  );
  const stylesheetResources = enabledResources.filter(
    (resource) =>
      resource.type === "stylesheet" || resource.type === "font-stylesheet",
  );
  const scriptAndModuleResources = enabledResources.filter(
    (resource) => resource.type === "script" || resource.type === "module",
  );

  const stylesheetSegment =
    options.stylesheet === "inline"
      ? [
          "<style>",
          escapeClosingSequence(source.stylesheet, "style"),
          "</style>",
        ].join("\n")
      : `<link rel="stylesheet" href="style.css">`;

  const ownScriptSegment =
    options.script === "inline"
      ? source.executionMode === "module"
        ? [
            '<script type="module">',
            escapeClosingSequence(source.script, "script"),
            "</script>",
          ].join("\n")
        : [
            "<script>",
            escapeClosingSequence(source.script, "script"),
            "</script>",
          ].join("\n")
      : source.executionMode === "module"
        ? '<script type="module" src="script.js"></script>'
        : '<script src="script.js"></script>';

  return [
    [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    ].join("\n"),
    source.headContent,
    ...stylesheetResources.map(stylesheetLinkSegment),
    stylesheetSegment,
    ["</head>", "<body>"].join("\n"),
    source.html,
    ...scriptAndModuleResources.map(resourceScriptTagSegment),
    ownScriptSegment,
    ["</body>", "</html>"].join("\n"),
  ].join("\n");
}

/**
 * A single, self-contained HTML document with the user's compiled CSS and
 * script inlined — runnable standalone in any browser with no build step,
 * no parent-application console bridge, and no postMessage wiring.
 */
export function buildStandaloneHtmlDocument(
  source: ProjectSource,
  resources: ExternalResource[],
): string {
  return buildDocument(source, resources, {
    stylesheet: "inline",
    script: "inline",
  });
}

/**
 * The `index.html` written into a ZIP export, which keeps the user's
 * compiled CSS/JS as sibling root files (`style.css`/`script.js`) instead of
 * inlining them.
 */
export function buildZipIndexHtmlDocument(
  source: ProjectSource,
  resources: ExternalResource[],
): string {
  return buildDocument(source, resources, {
    stylesheet: "linked",
    script: "linked",
  });
}
