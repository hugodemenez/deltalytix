import { describe, expect, it } from "vitest"
import { weeklyRecapBatchIdempotencyKey } from "./weekly-recap-idempotency"

const week = new Date("2026-08-03T00:00:00.000Z")

describe("weeklyRecapBatchIdempotencyKey", () => {
  it("is stable across runs for the same week and input batch", () => {
    const input = ["a@example.com", "b@example.com"]

    expect(weeklyRecapBatchIdempotencyKey(week, input)).toBe(
      weeklyRecapBatchIdempotencyKey(week, input),
    )
  })

  it("ignores recipient order and email casing, so a reshuffled batch still dedupes", () => {
    const first = ["a@example.com", "b@example.com"]
    const second = ["b@example.com", "A@Example.com "]

    expect(weeklyRecapBatchIdempotencyKey(week, second)).toBe(
      weeklyRecapBatchIdempotencyKey(week, first),
    )
  })

  it("stays the same when more of the input batch pass the gate on retry", () => {
    const inputBatch = [
      "a@example.com",
      "b@example.com",
      "c@example.com",
    ]
    const passedFirstRun = ["a@example.com", "b@example.com"]

    // Keying on who passed would change on a 70 → 100 recovery and re-mail
    // the original 70. The input-batch key must not follow that set.
    expect(
      weeklyRecapBatchIdempotencyKey(week, passedFirstRun),
    ).not.toBe(weeklyRecapBatchIdempotencyKey(week, inputBatch))

    expect(weeklyRecapBatchIdempotencyKey(week, inputBatch)).toBe(
      weeklyRecapBatchIdempotencyKey(week, [...inputBatch].reverse()),
    )
  })

  it("changes when the input batch loses a subscriber", () => {
    const full = ["a@example.com", "b@example.com"]
    const afterUnsubscribe = ["a@example.com"]

    expect(weeklyRecapBatchIdempotencyKey(week, afterUnsubscribe)).not.toBe(
      weeklyRecapBatchIdempotencyKey(week, full),
    )
  })

  it("changes from one recap week to the next", () => {
    const emails = ["a@example.com"]
    const nextWeek = new Date("2026-08-10T00:00:00.000Z")

    expect(weeklyRecapBatchIdempotencyKey(nextWeek, emails)).not.toBe(
      weeklyRecapBatchIdempotencyKey(week, emails),
    )
  })

  it("prefixes the key with the recap week", () => {
    expect(weeklyRecapBatchIdempotencyKey(week, ["a@example.com"])).toMatch(
      /^weekly-recap:2026-08-03:[0-9a-f]{32}$/,
    )
  })
})
