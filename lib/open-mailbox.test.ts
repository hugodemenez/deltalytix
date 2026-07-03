import { describe, expect, it } from "vitest"
import { detectPlatform, resolveMailboxTarget } from "./open-mailbox"

describe("detectPlatform", () => {
  it("detects iPhone Safari", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "iPhone",
        5,
      ),
    ).toBe("ios")
  })

  it("detects iPad in desktop mode", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        "MacIntel",
        5,
        true,
      ),
    ).toBe("ios")
  })

  it("detects iOS from userAgentData platform hint", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "MacIntel",
        0,
        false,
        "iOS",
      ),
    ).toBe("ios")
  })
})

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

  it("opens Gmail app with Apple Mail fallback on iOS", () => {
    expect(resolveMailboxTarget("user@gmail.com", "ios")).toEqual({
      primary: "googlegmail://",
      fallback: "message://",
    })
  })

  it("opens Proton app with Apple Mail fallback on iOS", () => {
    expect(resolveMailboxTarget("user@proton.me", "ios")).toEqual({
      primary: "protonmail://",
      fallback: "message://",
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
