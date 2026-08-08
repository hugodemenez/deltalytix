import { describe, expect, it } from "vitest"
import { escapeHtml, sanitizeJournalHtml } from "./sanitize-html"

describe("sanitizeJournalHtml", () => {
  it("removes script tags and event handlers", () => {
    const dirty =
      '<p>ok</p><img src="x" onerror="alert(1)"><script>alert(1)</script>'
    const clean = sanitizeJournalHtml(dirty)
    expect(clean).toContain("<p>ok</p>")
    expect(clean.toLowerCase()).not.toContain("<script")
    expect(clean.toLowerCase()).not.toContain("onerror")
  })

  it("returns empty string for nullish input", () => {
    expect(sanitizeJournalHtml(null)).toBe("")
    expect(sanitizeJournalHtml(undefined)).toBe("")
  })
})

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<b>"&'`)).toBe("&lt;b&gt;&quot;&amp;&#39;")
  })
})
