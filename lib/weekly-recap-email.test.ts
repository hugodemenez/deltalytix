import { describe, expect, it } from "vitest"
import { assertWeeklyRecapRecipient } from "./weekly-recap-recipient"
import {
  WEEKLY_RECAP_REPLY_TO,
  isValidResendReplyTo,
} from "./weekly-recap-reply-to"

/** Resend: `local@domain` or `Name <local@domain>`. */
const RESEND_REPLY_TO =
  /^(?:[^\s@<>]+@[^\s@<>]+|.+ <[^\s@<>]+@[^\s@<>]+>)$/

describe("assertWeeklyRecapRecipient", () => {
  it("accepts the same user id and email the cron resolved", () => {
    expect(() =>
      assertWeeklyRecapRecipient(
        { id: "user-1", email: "trader@example.com" },
        { userId: "user-1", email: "trader@example.com" },
      ),
    ).not.toThrow()
  })

  it("rejects a different user id", () => {
    expect(() =>
      assertWeeklyRecapRecipient(
        { id: "user-2", email: "trader@example.com" },
        { userId: "user-1", email: "trader@example.com" },
      ),
    ).toThrow("Weekly recap user mismatch")
  })

  it("rejects a different email on the same id", () => {
    expect(() =>
      assertWeeklyRecapRecipient(
        { id: "user-1", email: "other@example.com" },
        { userId: "user-1", email: "trader@example.com" },
      ),
    ).toThrow("Weekly recap user mismatch")
  })
})

describe("weekly recap Resend payload replyTo", () => {
  it("matches Resend accepted formats (local@domain or Name <local@domain>)", () => {
    const emailData = { replyTo: WEEKLY_RECAP_REPLY_TO }

    expect(emailData.replyTo).toContain("@")
    expect(emailData.replyTo).toMatch(RESEND_REPLY_TO)
    expect(isValidResendReplyTo(emailData.replyTo)).toBe(true)
  })

  it("rejects the malformed placeholder that caused production 422s", () => {
    expect("[REDACTED]").not.toContain("@")
    expect("[REDACTED]").not.toMatch(RESEND_REPLY_TO)
    expect(isValidResendReplyTo("[REDACTED]")).toBe(false)
  })

  it("accepts the named-address form Resend also allows", () => {
    expect(isValidResendReplyTo("Hugo <support@example.com>")).toBe(true)
  })
})
