import type { ProjectSource } from "../models/project";
import type { ExternalResource } from "../models/resource";
import { sortResourcesByOrder } from "../models/resource";
import { escapeClosingSequence } from "./closingTagEscape";
import { escapeHtmlAttribute } from "./htmlAttributeEscape";
import { buildPreviewBridgeScript } from "./previewBridge";
import type { LoaderResourceDescriptor } from "./previewResourceLoader";
import { buildPreviewResourceLoaderScript } from "./previewResourceLoader";

type TrackedBlockId = "style" | "html" | "script";

interface DocumentSegment {
  /**
   * Set only on the three segments whose first line offset
   * {@link computePreviewLineOffsets} needs to recover — every other
   * segment is fixed boilerplate that never needs source-line mapping.
   */
  trackedBlock?: TrackedBlockId;
  content: string;
}

function resourceDescriptor(
  resource: ExternalResource,
): LoaderResourceDescriptor {
  return {
    url: resource.url,
    integrity: resource.integrity,
    crossOrigin: resource.crossOrigin,
  };
}

/** A static `<link rel="stylesheet">` tag for a `"stylesheet"`/`"font-stylesheet"` resource. */
function stylesheetLinkSegment(resource: ExternalResource): DocumentSegment {
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
  return { content: `<link ${attributes.join(" ")}>` };
}

/**
 * The single source of truth for document structure, shared by
 * `buildPreviewDocument` (which renders every segment's content) and
 * `computePreviewLineOffsets` (which only needs each tracked segment's line
 * count). Keeping both derived from one list is what prevents the offsets
 * from silently drifting out of sync as the document's shape evolves.
 *
 * `stylesheetLanguage`/`scriptLanguage` are intentionally not branched on
 * here — this builder always injects `source.stylesheet`/`source.script`
 * verbatim. For SCSS-mode projects, the caller (`PreviewFrame`, via
 * `PreviewBuildCoordinator.beginBuild`/`buildDocument`) is responsible for
 * substituting already-compiled CSS into `source.stylesheet` before calling
 * `buildPreviewDocument`/`computePreviewLineOffsets` — this module has no
 * SCSS-compilation awareness of its own. Likewise, for TypeScript-mode
 * projects the caller substitutes the TS compiler's emitted JS into
 * `source.script` beforehand — this module has no TS-compilation awareness
 * of its own either.
 *
 * The user's script is emitted as an inert `<script type="text/plain"
 * data-glacier-user-script>` placeholder rather than an executing tag — the
 * bridge+loader script (`previewResourceLoader.ts`) reads its `.textContent`
 * and only actually executes it once every enabled external resource has
 * finished loading. Because the placeholder sits *before* the bridge+loader
 * `<script>` in document order, its line offset is knowable without first
 * generating the loader script that depends on it: segments are built in two
 * groups — everything through the placeholder's closing tag, then (once that
 * group's cumulative line count gives the loader the placeholder's start
 * line) the bridge+loader segment and the closing tags.
 */
function buildDocumentSegments(
  source: ProjectSource,
  executionId: string,
  resources: ExternalResource[],
): DocumentSegment[] {
  const enabledResources = sortResourcesByOrder(
    resources.filter((resource) => resource.enabled),
  );
  const stylesheetResources = enabledResources.filter(
    (resource) =>
      resource.type === "stylesheet" || resource.type === "font-stylesheet",
  );
  const scriptResources = enabledResources.filter(
    (resource) => resource.type === "script",
  );
  const moduleResources = enabledResources.filter(
    (resource) => resource.type === "module",
  );

  const leadingSegments: DocumentSegment[] = [
    {
      content: [
        "<!DOCTYPE html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
      ].join("\n"),
    },
    { content: source.headContent },
    ...stylesheetResources.map(stylesheetLinkSegment),
    { content: "<style>" },
    {
      trackedBlock: "style",
      content: escapeClosingSequence(source.stylesheet, "style"),
    },
    { content: ["</style>", "</head>", "<body>"].join("\n") },
    { trackedBlock: "html", content: source.html },
    { content: '<script type="text/plain" data-glacier-user-script>' },
  ];

  const scriptBlockStartLine = leadingSegments.reduce(
    (line, segment) => line + segment.content.split("\n").length,
    1,
  );

  const scriptBlockSegment: DocumentSegment = {
    trackedBlock: "script",
    content: escapeClosingSequence(source.script, "script"),
  };

  const loaderScript = buildPreviewResourceLoaderScript({
    scriptResources: scriptResources.map(resourceDescriptor),
    moduleResources: moduleResources.map(resourceDescriptor),
    executionMode: source.executionMode,
    scriptBlockStartLine,
  });

  return [
    ...leadingSegments,
    scriptBlockSegment,
    { content: "</script>" },
    {
      content: `<script>${buildPreviewBridgeScript(executionId)}${loaderScript}</script>`,
    },
    { content: ["</body>", "</html>"].join("\n") },
  ];
}

/**
 * Assembles the full HTML document rendered inside the sandboxed preview
 * iframe, including the console/error capture bridge (`previewBridge.ts`)
 * and the resource-loading gate (`previewResourceLoader.ts`) injected after
 * the user's HTML body and inert script placeholder, so interception is
 * active — and resource loading begins — before any user code runs.
 */
export function buildPreviewDocument(
  source: ProjectSource,
  executionId: string,
  resources: ExternalResource[],
): string {
  return buildDocumentSegments(source, executionId, resources)
    .map((segment) => segment.content)
    .join("\n");
}

export interface PreviewLineRange {
  /** 1-indexed document line at which the block's content begins. */
  start: number;
  /** 1-indexed document line at which the block's content ends (inclusive). */
  end: number;
}

export interface PreviewLineOffsets {
  style: PreviewLineRange;
  html: PreviewLineRange;
  script: PreviewLineRange;
}

/**
 * Derives the 1-indexed document line range of each of the three
 * user-authored blocks, from the exact same segment list
 * {@link buildPreviewDocument} assembles. Used by `mapErrorToSource.ts` to
 * translate a `runtime-error` message's browser-reported line number back
 * into a source panel + line — the range (not just a start line) is what
 * lets it tell a block's own lines apart from the boilerplate/bridge-script
 * lines that follow it. The execution id passed to the bridge script never
 * changes its own line count (it's inlined as a single-line string
 * literal), so a placeholder value here always yields the same ranges a
 * real build would. Resources only affect line counts of segments before
 * the tracked blocks that follow them (stylesheet `<link>` tags sit before
 * the tracked style block), so passing the real resource list keeps offsets
 * accurate regardless of how many are enabled.
 */
export function computePreviewLineOffsets(
  source: ProjectSource,
  resources: ExternalResource[],
): PreviewLineOffsets {
  const segments = buildDocumentSegments(
    source,
    "offset-computation-placeholder",
    resources,
  );
  const zero: PreviewLineRange = { start: 0, end: 0 };
  const offsets: PreviewLineOffsets = { style: zero, html: zero, script: zero };
  let line = 1;
  for (const segment of segments) {
    const segmentLineCount = segment.content.split("\n").length;
    if (segment.trackedBlock) {
      offsets[segment.trackedBlock] = {
        start: line,
        end: line + segmentLineCount - 1,
      };
    }
    line += segmentLineCount;
  }
  return offsets;
}
