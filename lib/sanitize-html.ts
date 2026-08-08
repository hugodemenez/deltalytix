import DOMPurify from "isomorphic-dompurify"

/**
 * Sanitize rich-text HTML persisted by TipTap / journal editors.
 * Strips scripts, event handlers, and dangerous URLs while keeping
 * common formatting tags the editor produces.
 */
export function sanitizeJournalHtml(html: string | null | undefined): string {
  if (!html) return ""

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "link", "meta", "base"],
    FORBID_ATTR: ["style"],
    ALLOW_DATA_ATTR: true,
  })
}

/** Escape text for safe interpolation into HTML attribute/text contexts. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
