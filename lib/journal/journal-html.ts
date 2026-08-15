/** Empty journal documents serialize as a bare paragraph, not `""`. */
const EMPTY_JOURNAL_HTML = new Set(["", "<p></p>", "<p><br></p>", "<p><br/></p>"])

export function isJournalEmptyHtml(html: string | undefined | null): boolean {
  if (!html) {
    return true
  }

  return EMPTY_JOURNAL_HTML.has(html.replace(/\s+/g, "").toLowerCase())
}

export function isSameJournalHtml(left: string, right: string): boolean {
  if (left === right) {
    return true
  }

  return isJournalEmptyHtml(left) && isJournalEmptyHtml(right)
}

export function sanitizeJournalHtml(html: string): string {
  if (!html) {
    return ""
  }

  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(iframe|object|embed|link|meta)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, "")
}

export function escapeJournalText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
}
