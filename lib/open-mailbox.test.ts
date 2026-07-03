import { describe, expect, it } from "vitest"
import { resolveMailboxTarget } from "./open-mailbox"

describe("resolveMailboxTarget", () => {
  it("opens Apple Mail inbox on iOS for unknown domains", () => {
    expect(resolveMailboxTarget("user@company.com", "ios")).toEqual({
      primary: "message://",
    })
  })

  it("opens Apple Mail inbox on iOS for iCloud addresses", () => {
    expect(resolveMailboxTarget("user@icloud.com", "ios")).toEqual({
      primary: "message://",
    })
  })

  it("opens Gmail app with web fallback on iOS", () => {
    expect(resolveMailboxTarget("user@gmail.com", "ios")).toEqual({
      primary: "googlegmail://",
      fallback: "https://mail.google.com/mail/u/0/#inbox",
      openInNewTab: true,
    })
  })

  it("opens Gmail web inbox on desktop", () => {
    expect(resolveMailboxTarget("user@gmail.com", "desktop")).toEqual({
      primary: "https://mail.google.com/mail/u/0/#inbox",
      openInNewTab: true,
    })
  })

  it("opens Outlook app with web fallback on Android", () => {
    expect(resolveMailboxTarget("user@outlook.com", "android")).toEqual({
      primary: "ms-outlook://",
      fallback: "https://outlook.live.com/mail/0/inbox",
      openInNewTab: true,
    })
  })

  it("returns null on desktop for unknown domains instead of mailto", () => {
    expect(resolveMailboxTarget("user@company.com", "desktop")).toBeNull()
  })
})
