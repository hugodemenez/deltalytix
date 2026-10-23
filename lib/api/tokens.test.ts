import { describe, expect, it } from "vitest"
import {
  DOCS_PLAYGROUND_TOKEN_NAME,
  DOCS_PLAYGROUND_TOKEN_TTL_HOURS,
  docsPlaygroundTokenExpiresAt,
  isAccessTokenExpired,
} from "./tokens"

describe("docsPlaygroundTokenExpiresAt", () => {
  it("expires a signed-in playground token after 24 hours", () => {
    const from = new Date("2026-10-09T12:00:00.000Z")
    const expires = docsPlaygroundTokenExpiresAt(from)

    expect(DOCS_PLAYGROUND_TOKEN_TTL_HOURS).toBe(24)
    expect(expires.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})

describe("isAccessTokenExpired", () => {
  const now = new Date("2026-10-17T12:00:00.000Z")

  it("keeps legitimate non-expiring personal access tokens valid", () => {
    expect(
      isAccessTokenExpired(
        { name: "CI integration", expiresAt: null },
        now,
      ),
    ).toBe(false)
  })

  it("treats a legacy docs playground token with null expiry as expired", () => {
    expect(
      isAccessTokenExpired(
        { name: DOCS_PLAYGROUND_TOKEN_NAME, expiresAt: null },
        now,
      ),
    ).toBe(true)
  })

  it("rejects tokens whose expiresAt is in the past", () => {
    expect(
      isAccessTokenExpired(
        {
          name: DOCS_PLAYGROUND_TOKEN_NAME,
          expiresAt: new Date("2026-10-16T12:00:00.000Z"),
        },
        now,
      ),
    ).toBe(true)
  })

  it("accepts tokens whose expiresAt is still in the future", () => {
    expect(
      isAccessTokenExpired(
        {
          name: DOCS_PLAYGROUND_TOKEN_NAME,
          expiresAt: new Date("2026-10-18T12:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false)
  })

  it("does not treat an unrelated null-expiry name as a playground token", () => {
    expect(
      isAccessTokenExpired(
        { name: "Docs playground backup", expiresAt: null },
        now,
      ),
    ).toBe(false)
  })
})
