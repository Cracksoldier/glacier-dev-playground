import type { PreviewLineOffsets } from "./previewDocument";

export interface MappedSourceLocation {
  panel: "html" | "style" | "script";
  line: number;
}

const PANELS: MappedSourceLocation["panel"][] = ["style", "html", "script"];

/**
 * Translates a `runtime-error` payload's browser-reported document line into
 * a source panel + within-block line, using the same block ranges
 * {@link computePreviewLineOffsets} derives from the document's actual
 * segment list. Returns `null` when the line falls outside all three
 * tracked blocks' ranges (e.g. inside the fixed boilerplate or the bridge
 * script).
 */
export function mapRuntimeErrorLine(
  documentLine: number,
  offsets: PreviewLineOffsets,
): MappedSourceLocation | null {
  for (const panel of PANELS) {
    const range = offsets[panel];
    if (documentLine >= range.start && documentLine <= range.end) {
      return { panel, line: documentLine - range.start + 1 };
    }
  }
  return null;
}
