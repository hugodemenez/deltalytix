import { describe, expect, it } from "vitest"
import {
  getRecapWeekUtc,
  getWeeklyRecapSkipReason,
  isEntryInWeek,
  shouldSendWeeklyRecap,
} from "./weekly-newsletter-window"

describe("getRecapWeekUtc", () => {
  it("on the Sunday cron covers the week just traded, not the one before", () => {
    // Cron fires Sun 2026-08-16 07:00 UTC → Mon 08-10 .. Sun 08-16
    const week = getRecapWeekUtc(new Date("2026-08-16T07:00:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-08-10T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-08-17T00:00:00.000Z")
  })

  it("resolves to the same week when re-run Monday morning", () => {
    // A repair run the next day must not jump to the fresh, empty week —
    // same window means the same Resend idempotency key.
    const sunday = getRecapWeekUtc(new Date("2026-08-16T07:00:00.000Z"))
    const mondayRetry = getRecapWeekUtc(new Date("2026-08-17T06:59:00.000Z"))
    expect(mondayRetry.start.toISOString()).toBe(sunday.start.toISOString())
    expect(mondayRetry.endExclusive.toISOString()).toBe(
      sunday.endExclusive.toISOString(),
    )
  })

  it("moves on once the 24h retry grace has passed", () => {
    // Tue 2026-08-18 → anchor Mon 08-17 → the new week
    const week = getRecapWeekUtc(new Date("2026-08-18T07:00:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-08-17T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-08-24T00:00:00.000Z")
  })

  it("returns the in-progress week when called mid-week (Wed)", () => {
    const week = getRecapWeekUtc(new Date("2026-08-12T15:30:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-08-10T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-08-17T00:00:00.000Z")
  })

  it("crosses month boundaries", () => {
    // Wed 2026-09-02 → anchor Tue 09-01 → Mon 2026-08-31 .. Sun 2026-09-06
    const week = getRecapWeekUtc(new Date("2026-09-02T12:00:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-08-31T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-09-07T00:00:00.000Z")
  })
})

describe("isEntryInWeek", () => {
  const week = getRecapWeekUtc(new Date("2026-08-05T12:00:00.000Z"))
  // week = 2026-08-03 .. 2026-08-10 exclusive

  it("includes Monday 00:00 UTC of the week", () => {
    expect(isEntryInWeek("2026-08-03T00:00:00.000Z", week)).toBe(true)
  })

  it("includes late Sunday of the week", () => {
    expect(isEntryInWeek("2026-08-09T23:59:59.999Z", week)).toBe(true)
  })

  it("excludes the following Monday 00:00 UTC", () => {
    expect(isEntryInWeek("2026-08-10T00:00:00.000Z", week)).toBe(false)
  })

  it("excludes the prior Sunday", () => {
    expect(isEntryInWeek("2026-08-02T23:59:59.999Z", week)).toBe(false)
  })

  it("rejects invalid dates", () => {
    expect(isEntryInWeek("not-a-date", week)).toBe(false)
  })
})

describe("shouldSendWeeklyRecap", () => {
  it("sends for a green week with trades and net PnL ≥ 0", () => {
    expect(shouldSendWeeklyRecap({ tradeCount: 3, netPnL: 12.5 })).toBe(true)
  })

  it("sends when net PnL is exactly zero with trades", () => {
    expect(shouldSendWeeklyRecap({ tradeCount: 1, netPnL: 0 })).toBe(true)
  })

  it("does not send when there are no trades", () => {
    expect(shouldSendWeeklyRecap({ tradeCount: 0, netPnL: 0 })).toBe(false)
  })

  it("does not send a red week (net PnL < 0)", () => {
    expect(shouldSendWeeklyRecap({ tradeCount: 5, netPnL: -0.01 })).toBe(false)
  })
})

describe("getWeeklyRecapSkipReason", () => {
  it("is null when the green-week gate allows a send", () => {
    expect(getWeeklyRecapSkipReason({ tradeCount: 3, netPnL: 12.5 })).toBe(null)
    expect(getWeeklyRecapSkipReason({ tradeCount: 1, netPnL: 0 })).toBe(null)
  })

  it("returns no_trades when there are no trades", () => {
    expect(getWeeklyRecapSkipReason({ tradeCount: 0, netPnL: 0 })).toBe(
      "no_trades",
    )
  })

  it("returns negative_net_pnl for a red week", () => {
    expect(getWeeklyRecapSkipReason({ tradeCount: 5, netPnL: -0.01 })).toBe(
      "negative_net_pnl",
    )
  })
})
