import { describe, expect, it } from 'vitest'
import { detectAccountBreach, filterTradesForBurstedAccount } from './account-breach'

const baseAccount = {
  number: 'TEST',
  startingBalance: 100_000,
  drawdownThreshold: 3_000,
  trailingDrawdown: false,
  trailingStopProfit: null,
  resetDate: null,
  bursted: false,
  breachDate: null,
}

describe('detectAccountBreach', () => {
  it('detects post-breach trades that need user confirmation', () => {
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: -4_000, commission: 0 },
      { accountNumber: 'TEST', entryDate: '2025-01-03', pnl: 500, commission: 0 },
    ]

    const detection = detectAccountBreach(baseAccount, trades as any)

    expect(detection.hasPostBreachTrades).toBe(true)
    expect(detection.needsUserConfirmation).toBe(true)
    expect(detection.breachDate?.toISOString().startsWith('2025-01-01')).toBe(true)
    expect(detection.firstPostBreachTradeDate?.toISOString().startsWith('2025-01-03')).toBe(
      true
    )
  })

  it('does not prompt when the account is already bursted', () => {
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: -4_000, commission: 0 },
      { accountNumber: 'TEST', entryDate: '2025-01-03', pnl: 500, commission: 0 },
    ]

    const detection = detectAccountBreach(
      { ...baseAccount, bursted: true, breachDate: new Date('2025-01-01') },
      trades as any
    )

    expect(detection.needsUserConfirmation).toBe(false)
  })

  it('does not prompt when reset date covers the post-breach trades', () => {
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: -4_000, commission: 0 },
      { accountNumber: 'TEST', entryDate: '2025-01-03', pnl: 500, commission: 0 },
    ]

    const detection = detectAccountBreach(
      { ...baseAccount, resetDate: new Date('2025-01-03') },
      trades as any
    )

    expect(detection.needsUserConfirmation).toBe(false)
  })
})

describe('filterTradesForBurstedAccount', () => {
  it('drops trades after the persisted breach date', () => {
    const trades = [
      { accountNumber: 'TEST', entryDate: '2025-01-01', pnl: -4_000, commission: 0 },
      { accountNumber: 'TEST', entryDate: '2025-01-03', pnl: 500, commission: 0 },
      { accountNumber: 'OTHER', entryDate: '2025-01-04', pnl: 100, commission: 0 },
    ]

    const filtered = filterTradesForBurstedAccount(
      {
        number: 'TEST',
        bursted: true,
        breachDate: new Date('2025-01-01'),
      },
      trades as any
    )

    expect(filtered).toHaveLength(2)
    expect(filtered.map((trade) => trade.entryDate)).toEqual([
      '2025-01-01',
      '2025-01-04',
    ])
  })
})
