import { describe, expect, it } from "vitest"
import {
  isResendIdempotentReplay,
  weeklyRecapIdempotencyKey,
} from "./weekly-recap-idempotency"

const week = new Date("2026-08-10T00:00:00.000Z")

describe("weeklyRecapIdempotencyKey", () => {
  it("is stable for the same week and recipient", () => {
    expect(weeklyRecapIdempotencyKey(week, "trader@example.com")).toBe(
      weeklyRecapIdempotencyKey(week, "trader@example.com"),
    )
  })

  it("normalizes casing and whitespace so a retry still 409s", () => {
    expect(weeklyRecapIdempotencyKey(week, " Trader@Example.com ")).toBe(
      weeklyRecapIdempotencyKey(week, "trader@example.com"),
    )
  })

  it("does not change when another subscriber is added", () => {
    const existing = weeklyRecapIdempotencyKey(week, "a@example.com")
    weeklyRecapIdempotencyKey(week, "new@example.com")
    expect(weeklyRecapIdempotencyKey(week, "a@example.com")).toBe(existing)
  })

  it("differs per recipient in the same week", () => {
    expect(weeklyRecapIdempotencyKey(week, "a@example.com")).not.toBe(
      weeklyRecapIdempotencyKey(week, "b@example.com"),
    )
  })

  it("changes from one recap week to the next", () => {
    const nextWeek = new Date("2026-08-17T00:00:00.000Z")
    expect(weeklyRecapIdempotencyKey(nextWeek, "a@example.com")).not.toBe(
      weeklyRecapIdempotencyKey(week, "a@example.com"),
    )
  })

  it("is week + normalized email", () => {
    expect(weeklyRecapIdempotencyKey(week, "trader@example.com")).toBe(
      "weekly-recap:2026-08-10:trader@example.com",
    )
  })
})

describe("isResendIdempotentReplay", () => {
  it("treats a changed-payload retry as already sent", () => {
    expect(
      isResendIdempotentReplay({ name: "invalid_idempotent_request" }),
    ).toBe(true)
  })

  it("treats an in-flight retry as already sent", () => {
    expect(
      isResendIdempotentReplay({ name: "concurrent_idempotent_requests" }),
    ).toBe(true)
  })

  it("does not swallow a real send error", () => {
    expect(isResendIdempotentReplay({ name: "application_error" })).toBe(false)
    expect(isResendIdempotentReplay(null)).toBe(false)
  })
})
