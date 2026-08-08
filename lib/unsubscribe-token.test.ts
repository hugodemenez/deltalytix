import { afterEach, describe, expect, it } from "vitest"
import {
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token"

const ORIGINAL_KEY = process.env.ENCRYPTION_KEY
const ORIGINAL_UNSUB = process.env.UNSUBSCRIBE_SECRET

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ENCRYPTION_KEY
  else process.env.ENCRYPTION_KEY = ORIGINAL_KEY
  if (ORIGINAL_UNSUB === undefined) delete process.env.UNSUBSCRIBE_SECRET
  else process.env.UNSUBSCRIBE_SECRET = ORIGINAL_UNSUB
})

describe("unsubscribe tokens", () => {
  it("round-trips a valid token", () => {
    process.env.ENCRYPTION_KEY = "a".repeat(64)
    const email = "User@Example.com"
    const token = createUnsubscribeToken(email)
    expect(verifyUnsubscribeToken(email, token)).toBe(true)
    expect(verifyUnsubscribeToken(email, "tampered")).toBe(false)
    expect(verifyUnsubscribeToken("other@example.com", token)).toBe(false)
  })

  it("builds a URL with email and token params", () => {
    process.env.ENCRYPTION_KEY = "b".repeat(64)
    const url = buildUnsubscribeUrl("https://app.example", "a@b.co")
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/api/email/unsubscribe")
    expect(parsed.searchParams.get("email")).toBe("a@b.co")
    expect(
      verifyUnsubscribeToken("a@b.co", parsed.searchParams.get("token")),
    ).toBe(true)
  })
})
