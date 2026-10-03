import { describe, expect, it } from "vitest"
import type { Trade as PrismaTrade } from "@/prisma/generated/prisma/browser"
import type { Account } from "@/context/data-provider"
import { computeAccountMetrics, computeMetricsForAccounts } from "./account-metrics"

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
