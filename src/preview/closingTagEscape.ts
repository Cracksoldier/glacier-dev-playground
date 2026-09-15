/**
 * Breaks any `</script` or `</style` sequence embedded in user source so it
 * can't prematurely close the surrounding `<script>`/`<style>` element when
 * injected into the generated preview document. The inserted backslash is
 * semantically inert in both languages: a no-op escape inside JS/CSS string
 * literals, and irrelevant everywhere else (comments, plain text).
 */
export function escapeClosingSequence(
  source: string,
  tagName: "script" | "style",
): string {
  const pattern = new RegExp(`</(${tagName})`, "gi");
  return source.replace(pattern, "<\\/$1");
}
