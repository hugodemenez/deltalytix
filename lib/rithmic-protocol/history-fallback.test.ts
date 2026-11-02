import { describe, expect, it } from 'vitest'
import { orderHistoryFallbackPlan } from './history-fallback'

describe('orderHistoryFallbackPlan', () => {
  it('uses order-history as the settled record when ShowFillHistory is empty', () => {
    expect(
      orderHistoryFallbackPlan({
        historyFillCount: 0,
        missingWindowCount: 2,
        alreadyFetched: false,
      }),
    ).toEqual({ source: 'history' })
  })

  it('does not refetch when the fallback already ran after a window error', () => {
    expect(
      orderHistoryFallbackPlan({
        historyFillCount: 12,
        missingWindowCount: 1,
        alreadyFetched: true,
      }),
    ).toBeNull()
  })

  it('still fetches order-history when later windows are empty but earlier ones had fills', () => {
    expect(
      orderHistoryFallbackPlan({
        historyFillCount: 40,
        missingWindowCount: 1,
        alreadyFetched: false,
      }),
    ).toEqual({ source: 'replay' })
  })

  it('skips order-history when every ShowFillHistory window returned rows', () => {
    expect(
      orderHistoryFallbackPlan({
        historyFillCount: 40,
        missingWindowCount: 0,
        alreadyFetched: false,
      }),
    ).toBeNull()
  })
})
