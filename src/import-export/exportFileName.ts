/**
 * Builds a filesystem-safe download filename from a project title: lowercase,
 * non-alphanumeric runs collapsed to a single hyphen, leading/trailing
 * hyphens trimmed, falling back to `"project"` when nothing alphanumeric
 * remains.
 */
export function buildExportFileName(title: string, extension: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "project"}.${extension}`;
}
