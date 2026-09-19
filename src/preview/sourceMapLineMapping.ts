const BASE64_VLQ_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const VLQ_BASE_SHIFT = 5;
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;
const VLQ_BASE_MASK = VLQ_BASE - 1;
const VLQ_CONTINUATION_BIT = VLQ_BASE;

function base64Value(char: string): number {
  const index = BASE64_VLQ_ALPHABET.indexOf(char);
  if (index === -1) {
    throw new Error(`Invalid base64 VLQ character: "${char}"`);
  }
  return index;
}

/** Decodes one base64-VLQ value starting at `segment[index]`, returning the (signed) value and the index just past it. */
function decodeVlq(
  segment: string,
  index: number,
): { value: number; nextIndex: number } {
  let result = 0;
  let shift = 0;
  let continuation = true;
  let cursor = index;
  while (continuation) {
    const digit = base64Value(segment[cursor]);
    cursor += 1;
    continuation = (digit & VLQ_CONTINUATION_BIT) !== 0;
    result += (digit & VLQ_BASE_MASK) << shift;
    shift += VLQ_BASE_SHIFT;
  }
  const isNegative = (result & 1) === 1;
  const magnitude = result >>> 1;
  return { value: isNegative ? -magnitude : magnitude, nextIndex: cursor };
}

/**
 * Decodes a source map's `mappings` field into one entry per *output*
 * (emitted JS) line, giving that line's 1-indexed source line — or
 * `undefined` for an output line with no mapping segments (e.g.
 * synthesized boilerplate with no source-line equivalent). Deliberately
 * line-only: only the first segment on each output line is used to derive
 * the source line, and column precision is discarded entirely. This app
 * only needs "which editor line does this stack-trace line correspond to"
 * (see `mapErrorToSource.ts`), not full source-map fidelity, and TS's
 * emitted output for this app's single-file compiles is always
 * single-source, so the source-index field is decoded (to keep the VLQ
 * cursor aligned) but never used.
 */
export function decodeOutputLineToSourceLine(
  mapJsonText: string,
): (number | undefined)[] {
  const parsed: unknown = JSON.parse(mapJsonText);
  const mappings =
    typeof parsed === "object" &&
    parsed !== null &&
    "mappings" in parsed &&
    typeof parsed.mappings === "string"
      ? parsed.mappings
      : undefined;
  if (mappings === undefined) return [];

  const result: (number | undefined)[] = [];
  // Cumulative per the source-map v3 spec: each segment's sourceLine field
  // is a *delta* from the running total, carried across the entire
  // `mappings` string (not reset per output line).
  let sourceLine = 0;

  for (const lineGroup of mappings.split(";")) {
    if (lineGroup.length === 0) {
      result.push(undefined);
      continue;
    }

    let firstSegmentSourceLine: number | undefined;
    for (const segment of lineGroup.split(",")) {
      if (segment.length === 0) continue;
      // Field 0: generatedColumn — decoded only to advance the cursor past it; value unused (no column precision).
      let cursor = decodeVlq(segment, 0).nextIndex;
      if (cursor >= segment.length) continue;
      // Field 1: sourceIndex — decoded only to advance the cursor; value unused (single-source-file assumption).
      cursor = decodeVlq(segment, cursor).nextIndex;
      // Field 2: sourceLine (the one field this function cares about).
      const sourceLineField = decodeVlq(segment, cursor);
      sourceLine += sourceLineField.value;
      if (firstSegmentSourceLine === undefined) {
        firstSegmentSourceLine = sourceLine + 1;
      }
    }
    result.push(firstSegmentSourceLine);
  }

  return result;
}
