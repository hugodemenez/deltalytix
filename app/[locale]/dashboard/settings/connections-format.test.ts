import { describe, expect, it } from "vitest"
import en from "@/locales/en/api-access"
import {
  apiScopeCoverage,
  appInitials,
  canRemoveRedirectUri,
  classifyLastUsed,
  draftFromApp,
  draftsEqual,
  fieldErrorMessage,
  firstErrorStep,
  formatConnectionDate,
  knownScopeCoverage,
  maskTokenPrefix,
  redirectHost,
  secretRotatedSource,
  tokenLast4,
  truncateIdentifier,
  uriRowErrorMessage,
} from "./connections-format"

describe("connections format", () => {
  it("covers every API scope in the design order", () => {
    expect(knownScopeCoverage()).toEqual(apiScopeCoverage())
  })

  it("formats English dates as d Mon yyyy", () => {
    expect(formatConnectionDate(new Date(2026, 8, 2, 12).toISOString(), "en")).toBe(
      "2 Sep 2026",
    )
  })

  it("classifies last used relative to now", () => {
    const now = new Date(2026, 8, 2, 15, 0, 0)
    expect(classifyLastUsed(null, now)).toEqual({ kind: "never" })
    expect(classifyLastUsed(new Date(2026, 8, 2, 14, 59, 30).toISOString(), now)).toEqual({
      kind: "justNow",
    })
    expect(classifyLastUsed(new Date(2026, 8, 2, 14, 40, 0).toISOString(), now)).toEqual({
      kind: "minutes",
      count: 20,
    })
    expect(classifyLastUsed(new Date(2026, 8, 2, 12, 0, 0).toISOString(), now)).toEqual({
      kind: "hours",
      count: 3,
    })
    expect(classifyLastUsed(new Date(2026, 8, 1, 18, 0, 0).toISOString(), now)).toEqual({
      kind: "yesterday",
    })
    expect(classifyLastUsed(new Date(2026, 7, 20, 12, 0, 0).toISOString(), now).kind).toBe(
      "date",
    )
  })

  it("truncates identifiers after 12 characters with an ellipsis", () => {
    expect(truncateIdentifier("dltx_app_3fK9abcd")).toBe("dltx_app_3fK…")
    expect(truncateIdentifier("short")).toBe("short")
  })

  it("masks a token prefix and keeps a session suffix", () => {
    expect(maskTokenPrefix()).toBe("dltx_••••")
    expect(maskTokenPrefix(tokenLast4("dltx_pat_secret99zz"))).toBe("dltx_••••99zz")
  })

  it("reads URI errors by submitted index and leaves the last URI locked", () => {
    const errors = [
      { field: "redirectUris" as const, index: 1, message: "Enter a full URL." },
      { field: "name" as const, message: "Name is required." },
    ]
    expect(uriRowErrorMessage(errors, 1)).toBe("Enter a full URL.")
    expect(uriRowErrorMessage(errors, 0)).toBeUndefined()
    expect(fieldErrorMessage(errors, "name")).toBe("Name is required.")
    expect(fieldErrorMessage(errors, "redirectUris")).toBeUndefined()
    expect(canRemoveRedirectUri(1)).toBe(false)
    expect(canRemoveRedirectUri(2)).toBe(true)
  })

  it("jumps to the earliest invalid step and compares drafts", () => {
    expect(firstErrorStep([{ field: "scopes", message: "Choose at least one permission." }])).toBe(
      3,
    )
    expect(firstErrorStep([{ field: "redirectUris", index: 0, message: "Enter a full URL." }])).toBe(
      2,
    )
    const draft = draftFromApp({
      name: "TradeSync",
      description: null,
      redirectUris: [],
      scopes: ["trades:write", "trades:read"],
    })
    expect(draft.redirectUris).toEqual([""])
    expect(
      draftsEqual(draft, {
        ...draft,
        scopes: ["trades:read", "trades:write"],
      }),
    ).toBe(true)
    expect(draftsEqual(draft, { ...draft, name: "Other" })).toBe(false)
  })

  it("falls back to createdAt when a secret has never been rotated", () => {
    expect(
      secretRotatedSource({ secretRotatedAt: null, createdAt: "2026-09-02T00:00:00.000Z" }),
    ).toBe("2026-09-02T00:00:00.000Z")
    expect(
      secretRotatedSource({
        secretRotatedAt: "2026-10-01T00:00:00.000Z",
        createdAt: "2026-09-02T00:00:00.000Z",
      }),
    ).toBe("2026-10-01T00:00:00.000Z")
    expect(appInitials("TradeSync")).toBe("TS")
    expect(appInitials("Notion importer")).toBe("N")
    expect(redirectHost("https://mytradingbot.app/callback")).toBe("mytradingbot.app")
  })
})

describe("connections English copy", () => {
  const copy = en

  it("matches the approved proof phrases", () => {
    expect(copy["dashboard.settings.connections"]).toBe("Connections")
    expect(copy["dashboard.settings.connections.yourApps"]).toBe("Your apps")
    expect(copy["dashboard.settings.connections.yourApps.description"]).toBe(
      "Build a tool other Deltalytix traders can connect to their account. They approve what it can see or do, and can disconnect anytime.",
    )
    expect(copy["dashboard.settings.connections.howItWorks"]).toBe("How it works")
    expect(copy["dashboard.settings.connections.yourApps.empty"]).toBe(
      "Register an app so other traders can connect it to their account.",
    )
    expect(copy["dashboard.settings.connections.authorizedApps.description"]).toBe(
      "Apps you allowed to access your account.",
    )
    expect(copy["dashboard.settings.connections.scopeNotice.many"]).toBe(
      "Your {count} connected users keep their current access until they reconnect or you revoke them.",
    )
    expect(copy["dashboard.settings.connections.scopeNoticeLead"]).toBe(
      "Changes apply when users reconnect.",
    )
    expect(copy["dashboard.settings.connections.delete.many"]).toBe(
      "This deletes {name} and disconnects its {count} users. Their access stops right away. This can’t be undone.",
    )
    expect(copy["dashboard.settings.connections.revokeApp.description"]).toContain("can’t")
    expect(copy["dashboard.settings.connections.step"]).toBe("Step {step} of 4 · {label}")
    expect(copy["dashboard.settings.connections.secretCalloutLead"]).toBe(
      "Copy it now, you won’t see it again.",
    )
    expect(copy["dashboard.settings.connections.how.step2.pill"]).toBe("Connect with Deltalytix")
    expect(copy["dashboard.settings.connections.scope.profileRead"]).toBe("Read your profile")
    expect(copy["dashboard.settings.connections.consent.canChange"]).toBe("Can change data")
    expect(copy["dashboard.settings.connections.lastUsedNever"]).toBe("Never used")
    expect(copy["dashboard.settings.connections.redirects.oneRequired"]).toBe(
      "At least one redirect URI is required.",
    )
  })
})
