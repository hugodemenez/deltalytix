import { describe, expect, it } from 'vitest'
import {
  fillHistoryWindowsComplete,
  orderHistoryFallbackPlan,
} from './history-fallback'

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

describe('fillHistoryWindowsComplete', () => {
  it('is complete when every planned window returned', () => {
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 3,
        windowsFetched: 3,
        windowThrew: false,
      }),
    ).toEqual({ complete: true, windowsFailed: 0 })
  })

  it('is incomplete when a window threw and fallback did not succeed', () => {
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 3,
        windowsFetched: 1,
        windowThrew: true,
        fallbackRequired: true,
        fallbackSucceeded: false,
      }),
    ).toEqual({ complete: false, windowsFailed: 2 })
  })

  it('is complete when a window threw but order-history fallback succeeded', () => {
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 3,
        windowsFetched: 1,
        windowThrew: true,
        fallbackRequired: true,
        fallbackSucceeded: true,
        replaySucceeded: true,
      }),
    ).toEqual({ complete: true, windowsFailed: 0 })
  })

  it('is incomplete when replay failed even if history windows returned', () => {
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 2,
        windowsFetched: 2,
        windowThrew: false,
        replaySucceeded: false,
      }),
    ).toEqual({ complete: false, windowsFailed: 1 })
  })

  it('treats an empty plan as complete', () => {
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 0,
        windowsFetched: 0,
        windowThrew: false,
      }),
    ).toEqual({ complete: true, windowsFailed: 0 })
  })
})
