/** TipTap's empty document serializes as a bare paragraph, not `""`. */
const EMPTY_TIPTAP_HTML = new Set(["", "<p></p>", "<p><br></p>", "<p><br/></p>"])

export function isTiptapEmptyHtml(html: string | undefined | null): boolean {
  if (!html) {
    return true
  }

  return EMPTY_TIPTAP_HTML.has(html.replace(/\s+/g, "").toLowerCase())
}

export function isSameTiptapHtml(left: string, right: string): boolean {
  if (left === right) {
    return true
  }

  return isTiptapEmptyHtml(left) && isTiptapEmptyHtml(right)
}
