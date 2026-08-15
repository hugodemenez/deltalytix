import { describe, expect, it } from "vitest"
import { isSameTiptapHtml, isTiptapEmptyHtml } from "./tiptap-html"

describe("isTiptapEmptyHtml", () => {
  it("treats TipTap empty documents as empty", () => {
    expect(isTiptapEmptyHtml("")).toBe(true)
    expect(isTiptapEmptyHtml("<p></p>")).toBe(true)
    expect(isTiptapEmptyHtml("<p><br></p>")).toBe(true)
    expect(isTiptapEmptyHtml("<p><br/></p>")).toBe(true)
    expect(isTiptapEmptyHtml(" <p></p> ")).toBe(true)
  })

  it("keeps real journal HTML", () => {
    expect(isTiptapEmptyHtml("<p>hello</p>")).toBe(false)
  })
})

describe("isSameTiptapHtml", () => {
  it("does not treat empty string and <p></p> as a content change", () => {
    expect(isSameTiptapHtml("", "<p></p>")).toBe(true)
    expect(isSameTiptapHtml("<p>a</p>", "<p>b</p>")).toBe(false)
  })
})
