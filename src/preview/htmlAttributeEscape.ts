/**
 * Escapes a string for safe use inside a double-quoted HTML attribute value
 * (e.g. `href="..."`, `integrity="..."`). Distinct from
 * {@link import("./closingTagEscape").escapeClosingSequence}, which only
 * escapes `</script`/`</style` sequences in text-node content — attribute
 * values need quote/ampersand/angle-bracket escaping instead, since they sit
 * inside a tag's attribute list, not a text node.
 */
export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
