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
 *
 * `scriptLineMap` (present only for a TS-mode compile, see `tsCompiler.ts`)
 * translates a `"script"` hit's within-block line — which is a line in the
 * *emitted JS* actually executed by the browser — back to the authored TS
 * source line. Falls back to the untranslated emitted-JS line when that
 * output line has no mapping (e.g. synthesized boilerplate), so click-to-
 * focus always lands somewhere rather than being dropped.
 */
export function mapRuntimeErrorLine(
  documentLine: number,
  offsets: PreviewLineOffsets,
  scriptLineMap?: (number | undefined)[] | null,
): MappedSourceLocation | null {
  for (const panel of PANELS) {
    const range = offsets[panel];
    if (documentLine >= range.start && documentLine <= range.end) {
      const line = documentLine - range.start + 1;
      if (panel === "script" && scriptLineMap) {
        const mappedLine = scriptLineMap[line - 1];
        return { panel, line: mappedLine ?? line };
      }
      return { panel, line };
    }
  }
  return null;
}
