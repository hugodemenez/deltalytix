import { describe, expect, it } from "vitest"
import {
  decodeJournalHtmlEntities,
  extractJournalImageSrcs,
  htmlToJournalExportText,
  htmlToPlainText,
} from "./html-to-plain-text"

describe("htmlToPlainText", () => {
  it("keeps emoji when flattening HTML", () => {
    expect(htmlToPlainText("<p>⭐ QUALITÉ</p>")).toBe("⭐ QUALITÉ")
  })
})

describe("htmlToJournalExportText", () => {
  it("preserves emoji, headings, and line breaks without image tags", () => {
    const html = `
      <h2>⭐ 6. QUALITÉ DU TRADE</h2>
      <p>🟠 B = valide mais imparfait</p>
      <p>🔴 C = trade faible / anticipé</p>
      <img src="https://example.supabase.co/storage/v1/object/public/trade-images/u/journal/abc.png" alt="" />
      <p>Setup : B / C</p>
    `
    const text = htmlToJournalExportText(html)
    expect(text).toContain("⭐ 6. QUALITÉ DU TRADE")
    expect(text).toContain("🟠 B = valide mais imparfait")
    expect(text).toContain("🔴 C = trade faible / anticipé")
    expect(text).toContain("Setup : B / C")
    expect(text).not.toContain("<img")
    expect(text).not.toContain("https://")
  })

  it("decodes numeric emoji entities", () => {
    expect(htmlToJournalExportText("<p>&#11088; note</p>")).toBe("⭐ note")
  })
})

describe("extractJournalImageSrcs", () => {
  it("returns unique image URLs in document order", () => {
    const html = `
      <p>one</p>
      <img src="https://host/a.png" />
      <img alt="chart" src='https://host/b.jpg' class="rounded-lg" />
      <img src="https://host/a.png" />
    `
    expect(extractJournalImageSrcs(html)).toEqual([
      "https://host/a.png",
      "https://host/b.jpg",
    ])
  })

  it("decodes HTML entities in src attributes", () => {
    expect(
      extractJournalImageSrcs(
        `<img src="https://host/img?x=1&amp;y=2.png" />`,
      ),
    ).toEqual(["https://host/img?x=1&y=2.png"])
  })
})

describe("decodeJournalHtmlEntities", () => {
  it("decodes hex emoji entities", () => {
    expect(decodeJournalHtmlEntities("&#x2B50;")).toBe("⭐")
  })
})
