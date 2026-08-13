import { describe, expect, it } from "vitest"
import {
  getLastCompleteWeekUtc,
  isEntryInWeek,
  shouldSendWeeklyRecap,
} from "./weekly-newsletter-window"

describe("getLastCompleteWeekUtc", () => {
  it("returns the previous Mon–Sun when mid-week (Wed)", () => {
    // Wed 2026-08-12 → last complete week Mon 2026-08-03 .. Sun 2026-08-09
    const week = getLastCompleteWeekUtc(new Date("2026-08-12T15:30:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-08-03T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-08-10T00:00:00.000Z")
  })

  it("on Sunday still uses the previous complete week (current week unfinished)", () => {
    // Sun 2026-08-09 08:00 UTC — current week Mon 08-03..Sun 08-09 is not complete
    const week = getLastCompleteWeekUtc(new Date("2026-08-09T08:00:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-07-27T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-08-03T00:00:00.000Z")
  })

  it("on Monday 00:00 UTC the week that just ended becomes complete", () => {
    const week = getLastCompleteWeekUtc(new Date("2026-08-10T00:00:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-08-03T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-08-10T00:00:00.000Z")
  })

  it("crosses month boundaries", () => {
    // Wed 2026-09-02 → last complete Mon 2026-08-24 .. Sun 2026-08-30
    const week = getLastCompleteWeekUtc(new Date("2026-09-02T12:00:00.000Z"))
    expect(week.start.toISOString()).toBe("2026-08-24T00:00:00.000Z")
    expect(week.endExclusive.toISOString()).toBe("2026-08-31T00:00:00.000Z")
  })
})

describe("isEntryInWeek", () => {
  const week = getLastCompleteWeekUtc(new Date("2026-08-12T12:00:00.000Z"))
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
