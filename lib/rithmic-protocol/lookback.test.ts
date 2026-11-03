import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REPLAY_LOOKBACK_DAYS,
  FALLBACK_REPLAY_LOOKBACK_DAYS,
  parseReplayLookbackDays,
  replayWindowStartSsboe,
  resolveReplayLookbackDays,
} from './lookback'

describe('parseReplayLookbackDays', () => {
  it('defaults to 7 when unset or invalid', () => {
    expect(parseReplayLookbackDays(undefined)).toBe(DEFAULT_REPLAY_LOOKBACK_DAYS)
    expect(parseReplayLookbackDays('')).toBe(DEFAULT_REPLAY_LOOKBACK_DAYS)
    expect(parseReplayLookbackDays('nope')).toBe(DEFAULT_REPLAY_LOOKBACK_DAYS)
    expect(parseReplayLookbackDays('0')).toBe(DEFAULT_REPLAY_LOOKBACK_DAYS)
  })

  it('accepts a positive integer override', () => {
    expect(parseReplayLookbackDays('14')).toBe(14)
  })
})

describe('resolveReplayLookbackDays', () => {
  it('never asks Replay for more days than the sync range', () => {
    expect(
      resolveReplayLookbackDays({ syncRangeDays: 2, requestedDays: 7 }),
    ).toEqual({ primary: 2, fallback: 2 })
  })

  it('caps at the requested window inside a longer sync range', () => {
    expect(
      resolveReplayLookbackDays({ syncRangeDays: 30, requestedDays: 7 }),
    ).toEqual({
      primary: DEFAULT_REPLAY_LOOKBACK_DAYS,
      fallback: FALLBACK_REPLAY_LOOKBACK_DAYS,
    })
  })

  it('falls back to 2d when the plant rejects a longer Replay window', () => {
    const { primary, fallback } = resolveReplayLookbackDays({
      syncRangeDays: 30,
      requestedDays: 7,
    })
    expect(primary).toBeGreaterThan(fallback)
    expect(fallback).toBe(FALLBACK_REPLAY_LOOKBACK_DAYS)
  })
})

describe('replayWindowStartSsboe', () => {
  it('subtracts whole days in seconds', () => {
    expect(replayWindowStartSsboe(1_700_000_000, 2)).toBe(
      1_700_000_000 - 2 * 24 * 60 * 60,
    )
  })
})
