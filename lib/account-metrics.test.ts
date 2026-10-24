import { describe, expect, it } from "vitest"
import type { Trade as PrismaTrade } from "@/prisma/generated/prisma/browser"
import type { Account } from "@/context/data-provider"
import { computeAccountMetrics, computeMetricsForAccounts } from "./account-metrics"
import { formatCalendarData } from "./utils"

const ACCOUNT_NUMBER = "LEGENDS-150K"

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acct-1",
    number: ACCOUNT_NUMBER,
    propfirm: "Legends",
    drawdownThreshold: 0,
    profitTarget: 0,
    isPerformance: false,
    userId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    startingBalance: 150_000,
    payoutCount: 0,
    trailingDrawdown: false,
    trailingStopProfit: null,
    resetDate: null,
    consistencyPercentage: 30,
    groupId: null,
    accountSize: "150k",
    accountSizeName: "150k",
    activationFees: null,
    balanceRequired: null,
    dailyLoss: null,
    evaluation: false,
    isRecursively: null,
    maxFundedAccounts: null,
    maxPayout: null,
    minDays: null,
    minPayout: null,
    minTradingDaysForPayout: null,
    payoutBonus: null,
    payoutPolicy: null,
    price: null,
    priceWithPromo: null,
    profitSharing: null,
    rulesDailyLoss: null,
    tradingNewsAllowed: true,
    trailing: null,
    autoRenewal: false,
    nextPaymentDate: null,
    paymentFrequency: null,
    promoPercentage: null,
    promoType: null,
    renewalNotice: null,
    minPnlToCountAsDay: 0,
    connectionId: null,
    buffer: 5_000,
    considerBuffer: true,
    shouldConsiderTradesBeforeReset: true,
    payouts: [],
    ...overrides,
  } as Account
}

function makeTrade(
  id: string,
  pnl: number,
  entryDate: string,
  extras: Partial<PrismaTrade> = {}
): PrismaTrade {
  return {
    id,
    accountNumber: ACCOUNT_NUMBER,
    accountId: "acct-1",
    quantity: 1,
    entryId: id,
    closeId: id,
    instrument: "ES",
    entryPrice: "1",
    closePrice: "1",
    entryDate,
    closeDate: entryDate,
    pnl,
    timeInPosition: 60,
    userId: "user-1",
    side: "long",
    commission: 0,
    createdAt: new Date(entryDate),
    comment: null,
    tags: [],
    imageBase64: null,
    videoUrl: null,
    imageBase64Second: null,
    groupId: null,
    images: [],
    ...extras,
  } as PrismaTrade
}

function makePayout(
  amount: number,
  date: string,
  status: string,
  id = `payout-${date}`
) {
  return {
    id,
    amount,
    date: new Date(date),
    createdAt: new Date(date),
    status,
    accountNumber: ACCOUNT_NUMBER,
    accountId: "acct-1",
    propfirmSharingPercentage: 0,
  }
}

describe("computeAccountMetrics buffer handling", () => {
  it("counts only profit above the buffer for the Legends 150k crossing-trade case", () => {
    // Cumulative profit before the crossing trade: +4,643.60 (still inside the $5,000 buffer).
    // Crossing trade +2,859.20 fills the remaining $356.40 of buffer and leaves $2,502.80 above it.
    const trades = [
      makeTrade("pre-buffer", 4_643.6, "2026-03-01T14:00:00.000Z"),
      makeTrade("crossing", 2_859.2, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(makeAccount(), trades)

    expect(result.aboveBuffer).toBeCloseTo(2_502.8, 5)
    expect(result.metrics.totalProfit).toBeCloseTo(2_502.8, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(152_502.8, 5)
    expect(result.balanceToDate).toBeCloseTo(152_502.8, 5)

    // Per-day figures still keep the crossing trade in full.
    expect(result.trades.map((trade) => trade.id)).toEqual(["crossing"])
    expect(result.metrics.dailyPnL["2026-03-02"]).toBeCloseTo(2_859.2, 5)
  })

  it("floors headline profit and balance at 0 when profit is still below the buffer", () => {
    const trades = [makeTrade("below", 3_000, "2026-03-01T14:00:00.000Z")]
    const result = computeAccountMetrics(makeAccount(), trades)

    expect(result.aboveBuffer).toBe(0)
    expect(result.metrics.totalProfit).toBe(0)
    expect(result.metrics.currentBalance).toBe(150_000)
    expect(result.balanceToDate).toBe(150_000)
    expect(result.trades).toEqual([])
    expect(result.metrics.dailyPnL).toEqual({})
  })

  it("nets PAID/VALIDATED payouts in accProfit and does not subtract them again", () => {
    // +8,000 of trades, $1,000 PAID payout, $5,000 buffer → $2,000 above buffer.
    // starting + aboveBuffer - payouts would wrongly yield 151,000.
    const trades = [
      makeTrade("t1", 3_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("t2", 3_000, "2026-03-02T14:00:00.000Z"),
      makeTrade("t3", 2_000, "2026-03-03T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        payouts: [makePayout(1_000, "2026-03-04T14:00:00.000Z", "PAID")],
      }),
      trades
    )

    expect(result.aboveBuffer).toBeCloseTo(2_000, 5)
    expect(result.metrics.totalProfit).toBeCloseTo(2_000, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(152_000, 5)
  })

  it("treats VALIDATED payouts the same as PAID and ignores PENDING", () => {
    const trades = [
      makeTrade("t1", 3_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("t2", 3_000, "2026-03-02T14:00:00.000Z"),
      makeTrade("t3", 2_000, "2026-03-03T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        payouts: [
          makePayout(1_000, "2026-03-04T14:00:00.000Z", "VALIDATED"),
          makePayout(4_000, "2026-03-05T14:00:00.000Z", "PENDING"),
        ],
      }),
      trades
    )

    expect(result.metrics.totalProfit).toBeCloseTo(2_000, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(152_000, 5)
  })

  it("drops back to 0 headline profit after a re-dip below the buffer", () => {
    const trades = [
      makeTrade("up", 6_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("redip", -2_000, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(makeAccount(), trades)

    expect(result.aboveBuffer).toBe(0)
    expect(result.metrics.totalProfit).toBe(0)
    expect(result.metrics.currentBalance).toBe(150_000)
    expect(result.trades.map((trade) => trade.id)).toEqual(["up", "redip"])
  })

  it("only counts the portion above the buffer after recovering from a re-dip", () => {
    const trades = [
      makeTrade("up", 6_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("redip", -2_500, "2026-03-02T14:00:00.000Z"),
      makeTrade("recover", 2_000, "2026-03-03T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(makeAccount(), trades)

    // accProfit = 5,500 → 500 above the $5,000 buffer
    expect(result.aboveBuffer).toBeCloseTo(500, 5)
    expect(result.metrics.totalProfit).toBeCloseTo(500, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(150_500, 5)
  })

  it("applies an interleaved payout that pushes profit back under the buffer without double-subtracting", () => {
    const trades = [
      makeTrade("up", 6_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("after-payout", 2_000, "2026-03-03T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        payouts: [makePayout(2_000, "2026-03-02T14:00:00.000Z", "PAID")],
      }),
      trades
    )

    // +6,000 - 2,000 + 2,000 = 6,000 → 1,000 above buffer
    expect(result.metrics.totalProfit).toBeCloseTo(1_000, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(151_000, 5)
  })

  it("leaves headline profit and balance unchanged when buffer is 0", () => {
    const trades = [
      makeTrade("t1", 4_643.6, "2026-03-01T14:00:00.000Z"),
      makeTrade("t2", 2_859.2, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(makeAccount({ buffer: 0 }), trades)

    expect(result.aboveBuffer).toBe(0)
    expect(result.metrics.totalProfit).toBeCloseTo(7_502.8, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(157_502.8, 5)
    expect(result.trades).toHaveLength(2)
  })

  it("subtracts payouts from balance but not from totalProfit when buffer is 0", () => {
    const trades = [
      makeTrade("t1", 4_643.6, "2026-03-01T14:00:00.000Z"),
      makeTrade("t2", 2_859.2, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        buffer: 0,
        payouts: [makePayout(1_000, "2026-03-03T14:00:00.000Z", "PAID")],
      }),
      trades
    )

    expect(result.metrics.totalProfit).toBeCloseTo(7_502.8, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(156_502.8, 5)
  })

  it("leaves headline profit and balance unchanged when considerBuffer is false", () => {
    const trades = [
      makeTrade("t1", 4_643.6, "2026-03-01T14:00:00.000Z"),
      makeTrade("t2", 2_859.2, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({ considerBuffer: false, buffer: 5_000 }),
      trades
    )

    expect(result.aboveBuffer).toBe(0)
    expect(result.metrics.totalProfit).toBeCloseTo(7_502.8, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(157_502.8, 5)
    expect(result.trades).toHaveLength(2)
  })

  it("does not mark a trailing account breached on the buffer-filling slice of the crossing trade", () => {
    // +6,000 fills a $5,000 buffer and leaves $1,000 above it.
    // Kept-trade equity peaks at starting + 6,000. With a $2,500 trailing
    // drawdown that high sits above the floored headline balance, so
    // remainingLoss hits 0 the moment the account crosses.
    const trades = [makeTrade("crossing", 6_000, "2026-03-01T14:00:00.000Z")]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        drawdownThreshold: 2_500,
      }),
      trades
    )

    expect(result.metrics.currentBalance).toBeCloseTo(151_000, 5)
    expect(result.metrics.highestBalance).toBeCloseTo(151_000, 5)
    expect(result.metrics.drawdownLevel).toBeCloseTo(148_500, 5)
    expect(result.metrics.remainingLoss).toBeCloseTo(2_500, 5)
  })

  it("trails the above-buffer high, not the kept-trade high, after further profit", () => {
    // Crossing slice is $356.40 of the $2,859.20 trade. A later +1,000
    // peaks counted profit at 3,502.80. The kept-trade high is 356.40 higher.
    const trades = [
      makeTrade("pre-buffer", 4_643.6, "2026-03-01T14:00:00.000Z"),
      makeTrade("crossing", 2_859.2, "2026-03-02T14:00:00.000Z"),
      makeTrade("after", 1_000, "2026-03-03T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        drawdownThreshold: 2_500,
      }),
      trades
    )

    expect(result.metrics.currentBalance).toBeCloseTo(153_502.8, 5)
    expect(result.metrics.highestBalance).toBeCloseTo(153_502.8, 5)
    expect(result.metrics.drawdownLevel).toBeCloseTo(151_002.8, 5)
    expect(result.metrics.remainingLoss).toBeCloseTo(2_500, 5)
  })

  it("locks trailing drawdown from above-buffer profit, not the buffer-filling slice", () => {
    // Kept-trade profit is $6,500, which would trip a $2,000 trailing stop.
    // Counted profit is only $1,500, so the floor must keep trailing.
    const trades = [makeTrade("crossing", 6_500, "2026-03-01T14:00:00.000Z")]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        trailingStopProfit: 2_000,
        drawdownThreshold: 2_500,
      }),
      trades
    )

    expect(result.metrics.highestBalance).toBeCloseTo(151_500, 5)
    expect(result.metrics.drawdownLevel).toBeCloseTo(149_000, 5)
    expect(result.metrics.remainingLoss).toBeCloseTo(2_500, 5)
  })

  it("shows a static drawdown breach when a re-dip falls through the buffer past the floor", () => {
    // +6,000 then -4,500 → $1,500 net, $3,500 below the $5,000 buffer.
    // Headline balance floors at the start, and full kept-trade equity
    // (starting + 1,500) is still above a $2,000 static floor, so both hide
    // the breach. Buffer-adjusted equity is starting - 3,500.
    const trades = [
      makeTrade("up", 6_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("redip", -4_500, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: false,
        drawdownThreshold: 2_000,
      }),
      trades
    )

    expect(result.metrics.currentBalance).toBe(150_000)
    expect(result.metrics.highestBalance).toBeCloseTo(151_000, 5)
    expect(result.metrics.drawdownLevel).toBe(148_000)
    expect(result.metrics.remainingLoss).toBe(0)
    expect(result.metrics.drawdownProgress).toBe(100)
  })

  it("keeps static remaining loss while a re-dip is still inside the drawdown", () => {
    // +6,000 then -2,000 → counted profit -1,000. Floor is 2,000 below the start.
    const trades = [
      makeTrade("up", 6_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("redip", -2_000, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: false,
        drawdownThreshold: 2_000,
      }),
      trades
    )

    expect(result.metrics.currentBalance).toBe(150_000)
    expect(result.metrics.remainingLoss).toBeCloseTo(1_000, 5)
    expect(result.metrics.drawdownProgress).toBeCloseTo(50, 5)
  })

  it("does not let a payout raise the trailing high, and still nets it into remaining loss", () => {
    const trades = [
      makeTrade("up", 8_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("after", 500, "2026-03-03T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        drawdownThreshold: 2_500,
        payouts: [makePayout(1_000, "2026-03-02T14:00:00.000Z", "PAID")],
      }),
      trades
    )

    // Peak counted profit is 8,000 - 5,000 = 3,000, before the payout.
    // Final counted profit is 8,500 - 1,000 - 5,000 = 2,500.
    expect(result.metrics.currentBalance).toBeCloseTo(152_500, 5)
    expect(result.metrics.highestBalance).toBeCloseTo(153_000, 5)
    expect(result.metrics.drawdownLevel).toBeCloseTo(150_500, 5)
    expect(result.metrics.remainingLoss).toBeCloseTo(2_000, 5)
  })

  it("does not breach trailing drawdown on a re-dip that stays within the above-buffer high", () => {
    // Counted profit peaks at $3,000 and settles at $2,600. A $2,500 trail
    // still has $2,100 of room. Kept-trade equity would already be breached.
    const trades = [
      makeTrade("up", 8_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("dip", -400, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        drawdownThreshold: 2_500,
      }),
      trades
    )

    expect(result.metrics.highestBalance).toBeCloseTo(153_000, 5)
    expect(result.metrics.drawdownLevel).toBeCloseTo(150_500, 5)
    expect(result.metrics.currentBalance).toBeCloseTo(152_600, 5)
    expect(result.metrics.remainingLoss).toBeCloseTo(2_100, 5)
  })

  it("breaches trailing drawdown when the re-dip gives back more than the threshold from the above-buffer high", () => {
    const trades = [
      makeTrade("up", 8_000, "2026-03-01T14:00:00.000Z"),
      makeTrade("dip", -4_000, "2026-03-02T14:00:00.000Z"),
    ]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        drawdownThreshold: 2_500,
      }),
      trades
    )

    expect(result.metrics.highestBalance).toBeCloseTo(153_000, 5)
    expect(result.metrics.drawdownLevel).toBeCloseTo(150_500, 5)
    expect(result.metrics.remainingLoss).toBe(0)
  })

  it("locks the trailing floor once above-buffer profit reaches the stop", () => {
    const trades = [makeTrade("crossing", 7_000, "2026-03-01T14:00:00.000Z")]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        trailingStopProfit: 2_000,
        drawdownThreshold: 2_500,
      }),
      trades
    )

    expect(result.metrics.highestBalance).toBeCloseTo(152_000, 5)
    expect(result.metrics.drawdownLevel).toBe(149_500)
    // Locked floor is stop minus the threshold. At the stop, room equals the threshold.
    expect(result.metrics.remainingLoss).toBeCloseTo(2_500, 5)
  })

  it("keeps pre-buffer drawdown metrics flat until the buffer is crossed", () => {
    const trades = [makeTrade("below", 3_000, "2026-03-01T14:00:00.000Z")]
    const result = computeAccountMetrics(
      makeAccount({
        trailingDrawdown: true,
        drawdownThreshold: 2_500,
      }),
      trades
    )

    expect(result.metrics.currentBalance).toBe(150_000)
    expect(result.metrics.highestBalance).toBe(150_000)
    expect(result.metrics.drawdownLevel).toBe(147_500)
    expect(result.metrics.remainingLoss).toBe(2_500)
  })

  it("still measures drawdown from full equity when the buffer is off", () => {
    const trailing = computeAccountMetrics(
      makeAccount({
        buffer: 0,
        trailingDrawdown: true,
        drawdownThreshold: 2_000,
      }),
      [makeTrade("win", 1_000, "2026-03-01T14:00:00.000Z")]
    )
    expect(trailing.metrics.highestBalance).toBe(151_000)
    expect(trailing.metrics.drawdownLevel).toBe(149_000)
    expect(trailing.metrics.remainingLoss).toBe(2_000)

    const breached = computeAccountMetrics(
      makeAccount({
        buffer: 0,
        trailingDrawdown: false,
        drawdownThreshold: 2_000,
      }),
      [makeTrade("loss", -3_000, "2026-03-01T14:00:00.000Z")]
    )
    expect(breached.metrics.currentBalance).toBe(147_000)
    expect(breached.metrics.drawdownLevel).toBe(148_000)
    expect(breached.metrics.remainingLoss).toBe(0)
  })

  it("propagates the same headline figures through computeMetricsForAccounts", () => {
    const trades = [
      makeTrade("pre-buffer", 4_643.6, "2026-03-01T14:00:00.000Z"),
      makeTrade("crossing", 2_859.2, "2026-03-02T14:00:00.000Z"),
    ]
    const [account] = computeMetricsForAccounts([makeAccount()], trades)

    expect(account.aboveBuffer).toBeCloseTo(2_502.8, 5)
    expect(account.metrics?.totalProfit).toBeCloseTo(2_502.8, 5)
    expect(account.metrics?.currentBalance).toBeCloseTo(152_502.8, 5)
    expect(account.balanceToDate).toBeCloseTo(152_502.8, 5)
  })
})

describe("computeAccountMetrics timezone", () => {
  // New York user (EDT, UTC-4). Two trades are in the evening, after 20:00 ET, which is the next day in UTC.
  const timezone = "America/New_York"
  const trades = [
    makeTrade("tue-morning", 600, "2026-10-13T14:00:00.000Z"), // Tue 10:00 ET
    makeTrade("tue-evening", 500, "2026-10-13T22:30:00.000Z"), // Tue 18:30 ET
    makeTrade("wed-morning", 400, "2026-10-14T14:00:00.000Z"), // Wed 10:00 ET
    makeTrade("wed-evening", 100, "2026-10-15T00:30:00.000Z"), // Wed 20:30 ET, Thu in UTC
  ]
  const account = makeAccount({ buffer: 0, profitTarget: 3_000, drawdownThreshold: 2_000 })

  it("groups daily P&L and trading days by the user's calendar day", () => {
    const { metrics, dailyMetrics } = computeAccountMetrics(account, trades, timezone)

    expect(metrics.dailyPnL).toEqual({ "2026-10-13": 1_100, "2026-10-14": 500 })
    expect(metrics.totalTradingDays).toBe(2)
    expect(metrics.validTradingDays).toBe(2)
    expect(dailyMetrics.map((day) => day.pnl)).toEqual([1_100, 500])
  })

  it("matches the calendar's day buckets for the same trades", () => {
    const { metrics } = computeAccountMetrics(account, trades, timezone)
    const calendar = formatCalendarData(trades, [account], timezone)
    const calendarPnL = Object.fromEntries(
      Object.entries(calendar).map(([date, day]) => [date, (day as { pnl: number }).pnl])
    )

    expect(metrics.dailyPnL).toEqual(calendarPnL)
  })

  it("passes the timezone through computeMetricsForAccounts", () => {
    const [withMetrics] = computeMetricsForAccounts([account], trades, timezone)

    expect(withMetrics.metrics?.totalTradingDays).toBe(2)
  })

  it("keeps UTC days when no timezone is given", () => {
    const { metrics } = computeAccountMetrics(account, trades)

    expect(metrics.dailyPnL).toEqual({ "2026-10-13": 1_100, "2026-10-14": 400, "2026-10-15": 100 })
    expect(metrics.totalTradingDays).toBe(3)
  })

  it("falls back to UTC days for an unknown timezone", () => {
    const { metrics } = computeAccountMetrics(account, trades, "Not/A_Zone")

    expect(metrics.totalTradingDays).toBe(3)
  })

  it("puts a payout on the user's calendar day", () => {
    const withPayout = makeAccount({
      buffer: 0,
      payouts: [makePayout(300, "2026-10-15T01:00:00.000Z", "PAID")], // Wed 21:00 ET
    })
    const { dailyMetrics } = computeAccountMetrics(withPayout, trades, timezone)

    expect(dailyMetrics).toHaveLength(2)
    expect(dailyMetrics[1].payout?.amount).toBe(300)
  })
})
