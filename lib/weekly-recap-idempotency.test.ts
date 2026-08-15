import { describe, expect, it } from "vitest"
import { weeklyRecapBatchIdempotencyKey } from "./weekly-recap-idempotency"

const week = new Date("2026-08-03T00:00:00.000Z")

describe("weeklyRecapBatchIdempotencyKey", () => {
  it("is stable across runs for the same week and recipients", () => {
    const emails = [{ to: ["a@example.com"] }, { to: ["b@example.com"] }]

    expect(weeklyRecapBatchIdempotencyKey(week, emails)).toBe(
      weeklyRecapBatchIdempotencyKey(week, emails),
    )
  })

  it("ignores recipient order, so a reshuffled batch still dedupes", () => {
    const first = [{ to: ["a@example.com"] }, { to: ["b@example.com"] }]
    const second = [{ to: ["b@example.com"] }, { to: ["A@Example.com "] }]

    expect(weeklyRecapBatchIdempotencyKey(week, second)).toBe(
      weeklyRecapBatchIdempotencyKey(week, first),
    )
  })

  it("changes when the batch loses a recipient", () => {
    const full = [{ to: ["a@example.com"] }, { to: ["b@example.com"] }]
    const afterUnsubscribe = [{ to: ["a@example.com"] }]

    expect(weeklyRecapBatchIdempotencyKey(week, afterUnsubscribe)).not.toBe(
      weeklyRecapBatchIdempotencyKey(week, full),
    )
  })

  it("changes from one recap week to the next", () => {
    const emails = [{ to: ["a@example.com"] }]
    const nextWeek = new Date("2026-08-10T00:00:00.000Z")

    expect(weeklyRecapBatchIdempotencyKey(nextWeek, emails)).not.toBe(
      weeklyRecapBatchIdempotencyKey(week, emails),
    )
  })

  it("prefixes the key with the recap week", () => {
    expect(
      weeklyRecapBatchIdempotencyKey(week, [{ to: ["a@example.com"] }]),
    ).toMatch(/^weekly-recap:2026-08-03:[0-9a-f]{32}$/)
  })
})
