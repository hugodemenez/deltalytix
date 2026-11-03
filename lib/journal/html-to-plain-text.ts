export function htmlToPlainText(html: string): string {
  if (!html) {
    return ""
  }
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html")
    return doc.body.textContent?.trim() ?? ""
  }
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function codePointToChar(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
    return ""
  }
  try {
    return String.fromCodePoint(code)
  } catch {
    return ""
  }
}

export function decodeJournalHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      codePointToChar(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      codePointToChar(Number.parseInt(dec, 10)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
}

/** Flatten journal HTML for Word export: keep emoji, drop tags, restore line breaks. */
export function htmlToJournalExportText(html: string): string {
  if (!html) {
    return ""
  }

  const withBreaks = html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|table|ul|ol)\s*>/gi, "\n")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")

  return decodeJournalHtmlEntities(withBreaks)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const IMG_SRC_RE =
  /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi

/** Unique `img src` values from a journal HTML document, in document order. */
export function extractJournalImageSrcs(html: string): string[] {
  if (!html) {
    return []
  }

  const srcs: string[] = []
  const seen = new Set<string>()
  for (const match of html.matchAll(IMG_SRC_RE)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? ""
    const src = decodeJournalHtmlEntities(raw).trim()
    if (!src || seen.has(src)) {
      continue
    }
    seen.add(src)
    srcs.push(src)
  }
  return srcs
}
