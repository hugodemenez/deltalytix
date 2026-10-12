import { describe, expect, it } from "vitest"
import {
  DOCS_PLAYGROUND_TOKEN_TTL_HOURS,
  docsPlaygroundTokenExpiresAt,
} from "./tokens"

describe("docsPlaygroundTokenExpiresAt", () => {
  it("expires a signed-in playground token after 24 hours", () => {
    const from = new Date("2026-10-09T12:00:00.000Z")
    const expires = docsPlaygroundTokenExpiresAt(from)

    expect(DOCS_PLAYGROUND_TOKEN_TTL_HOURS).toBe(24)
    expect(expires.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})
