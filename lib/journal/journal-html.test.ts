import { describe, expect, it } from "vitest"
import {
  escapeJournalText,
  isJournalEmptyHtml,
  isSameJournalHtml,
  sanitizeJournalHtml,
} from "./journal-html"

describe("isJournalEmptyHtml", () => {
  it("treats empty documents as empty", () => {
    expect(isJournalEmptyHtml("")).toBe(true)
    expect(isJournalEmptyHtml("<p></p>")).toBe(true)
    expect(isJournalEmptyHtml("<p><br></p>")).toBe(true)
    expect(isJournalEmptyHtml("<p><br/></p>")).toBe(true)
    expect(isJournalEmptyHtml(" <p></p> ")).toBe(true)
  })

  it("keeps real journal HTML", () => {
    expect(isJournalEmptyHtml("<p>hello</p>")).toBe(false)
  })
})

describe("isSameJournalHtml", () => {
  it("does not treat empty string and <p></p> as a content change", () => {
    expect(isSameJournalHtml("", "<p></p>")).toBe(true)
    expect(isSameJournalHtml("<p>a</p>", "<p>b</p>")).toBe(false)
  })
})

describe("sanitizeJournalHtml", () => {
  it("strips scripts and event handlers", () => {
    const clean = sanitizeJournalHtml(
      `<p onclick="alert(1)">ok</p><script>alert(1)</script>`,
    )
    expect(clean).toContain("ok")
    expect(clean).not.toMatch(/script|onclick/i)
  })
})

describe("escapeJournalText", () => {
  it("escapes HTML and keeps line breaks", () => {
    expect(escapeJournalText("<hi>\nthere")).toBe("&lt;hi&gt;<br>there")
  })
})
