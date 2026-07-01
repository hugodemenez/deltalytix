import { describe, expect, it } from 'vitest'
import { clampBalanceAtDrawdownFloor, computeDrawdownLevel } from './account-drawdown'
import { computeAccountMetrics } from './account-metrics'

describe('computeDrawdownLevel', () => {
  it('uses static floor relative to starting balance', () => {
    expect(
      computeDrawdownLevel({
        startingBalance: 100_000,
        drawdownThreshold: 3_000,
        highestBalance: 105_000,
      })
    ).toBe(97_000)
  })

  it('trails highest balance when trailing drawdown is enabled', () => {
    expect(
      computeDrawdownLevel({
        startingBalance: 100_000,
        drawdownThreshold: 3_000,
        trailingDrawdown: true,
        highestBalance: 115_000,
      })
    ).toBe(112_000)
  })

  it('locks drawdown after trailing stop profit is reached', () => {
    expect(
      computeDrawdownLevel({
        startingBalance: 100_000,
        drawdownThreshold: 3_000,
        trailingDrawdown: true,
        trailingStopProfit: 10_000,
        highestBalance: 120_000,
      })
    ).toBe(107_000)
  })
})

describe('clampBalanceAtDrawdownFloor', () => {
  it('clamps breached balances to the drawdown floor', () => {
    expect(clampBalanceAtDrawdownFloor(96_000, 3_000, 97_000)).toBe(97_000)
  })

  it('leaves balances above the floor unchanged', () => {
    expect(clampBalanceAtDrawdownFloor(105_000, 3_000, 97_000)).toBe(105_000)
  })

  it('skips clamping when no drawdown threshold is configured', () => {
    expect(clampBalanceAtDrawdownFloor(50_000, 0, 97_000)).toBe(50_000)
  })
})

describe('computeAccountMetrics drawdown floor', () => {
  const baseAccount = {
    number: 'TEST',
    startingBalance: 100_000,
    drawdownThreshold: 3_000,
    trailingDrawdown: false,
    profitTarget: 10_000,
    payouts: [],
    resetDate: null,
  }

  it('clamps breached account balances and zeroes remaining loss', () => {
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: 8_000, commission: 0 },
      { accountNumber: 'TEST', entryDate: '2025-01-02', pnl: -12_000, commission: 0 },
    ]

    const result = computeAccountMetrics(baseAccount as any, trades as any)

    expect(result.metrics.currentBalance).toBe(97_000)
    expect(result.metrics.drawdownLevel).toBe(97_000)
    expect(result.metrics.remainingLoss).toBe(0)
    expect(result.dailyMetrics.at(-1)?.totalBalance).toBe(97_000)
  })

  it('leaves non-breached balances unchanged', () => {
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: 5_000, commission: 0 },
    ]

    const result = computeAccountMetrics(baseAccount as any, trades as any)

    expect(result.metrics.currentBalance).toBe(105_000)
    expect(result.metrics.remainingLoss).toBe(8_000)
    expect(result.dailyMetrics.at(-1)?.totalBalance).toBe(105_000)
  })

  it('clamps trailing drawdown breaches using the trailing floor', () => {
    const trailingAccount = { ...baseAccount, trailingDrawdown: true }
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: 15_000, commission: 0 },
      { accountNumber: 'TEST', entryDate: '2025-01-02', pnl: -20_000, commission: 0 },
    ]

    const result = computeAccountMetrics(trailingAccount as any, trades as any)

    expect(result.metrics.currentBalance).toBe(112_000)
    expect(result.metrics.remainingLoss).toBe(0)
    expect(result.dailyMetrics.at(-1)?.totalBalance).toBe(112_000)
  })

  it('propagates clamped balance into subsequent daily metrics', () => {
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: -4_000, commission: 0 },
      { accountNumber: 'TEST', entryDate: '2025-01-02', pnl: 1_000, commission: 0 },
    ]

    const result = computeAccountMetrics(baseAccount as any, trades as any)

    expect(result.dailyMetrics).toHaveLength(2)
    expect(result.dailyMetrics[0]?.totalBalance).toBe(97_000)
    expect(result.dailyMetrics[1]?.totalBalance).toBe(98_000)
  })
})
