import { describe, expect, it } from "vitest"
import { assertWeeklyRecapRecipient } from "./weekly-recap-recipient"

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
