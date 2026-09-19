import type { ProjectSource } from "../models/project";
import { escapeClosingSequence } from "./closingTagEscape";
import { buildPreviewBridgeScript } from "./previewBridge";

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
 */
function buildDocumentSegments(
  source: ProjectSource,
  executionId: string,
): DocumentSegment[] {
  const scriptTagOpen =
    source.executionMode === "module" ? '<script type="module">' : "<script>";

  return [
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
    { content: "<style>" },
    {
      trackedBlock: "style",
      content: escapeClosingSequence(source.stylesheet, "style"),
    },
    { content: ["</style>", "</head>", "<body>"].join("\n") },
    { trackedBlock: "html", content: source.html },
    { content: `<script>${buildPreviewBridgeScript(executionId)}</script>` },
    { content: scriptTagOpen },
    {
      trackedBlock: "script",
      content: escapeClosingSequence(source.script, "script"),
    },
    { content: ["</script>", "</body>", "</html>"].join("\n") },
  ];
}

/**
 * Assembles the full HTML document rendered inside the sandboxed preview
 * iframe, including the console/error capture bridge (`previewBridge.ts`)
 * injected after the user's HTML body and before the user's own `<script>`,
 * so interception is active before any user code runs.
 */
export function buildPreviewDocument(
  source: ProjectSource,
  executionId: string,
): string {
  return buildDocumentSegments(source, executionId)
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
 * real build would.
 */
export function computePreviewLineOffsets(
  source: ProjectSource,
): PreviewLineOffsets {
  const segments = buildDocumentSegments(
    source,
    "offset-computation-placeholder",
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
