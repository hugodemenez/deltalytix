import { describe, expect, it } from 'vitest'
import {
  excludeWeekendBlockedConnections,
  isLocalWeekend,
  isRithmicWeekendDowntime,
} from './rithmic-weekend'

// Local calendar dates so timezone offsets cannot flip the weekday.
const sunday = new Date(2026, 8, 20)
const saturday = new Date(2026, 8, 19)
const monday = new Date(2026, 8, 21)
const friday = new Date(2026, 8, 18)

describe('isLocalWeekend', () => {
  it('is true on Saturday and Sunday', () => {
    expect(isLocalWeekend(saturday)).toBe(true)
    expect(isLocalWeekend(sunday)).toBe(true)
  })

  it('is false on weekdays', () => {
    expect(isLocalWeekend(monday)).toBe(false)
    expect(isLocalWeekend(friday)).toBe(false)
    expect(isLocalWeekend(new Date(2026, 8, 22))).toBe(false)
    expect(isLocalWeekend(new Date(2026, 8, 23))).toBe(false)
    expect(isLocalWeekend(new Date(2026, 8, 24))).toBe(false)
  })
})

describe('isRithmicWeekendDowntime', () => {
  it('flags Rithmic and Rithmic Protocol on the weekend', () => {
    expect(isRithmicWeekendDowntime('rithmic', sunday)).toBe(true)
    expect(isRithmicWeekendDowntime('rithmic-protocol', saturday)).toBe(true)
  })

  it('leaves other brokers alone on the weekend', () => {
    expect(isRithmicWeekendDowntime('tradovate', sunday)).toBe(false)
    expect(isRithmicWeekendDowntime('dxfeed', sunday)).toBe(false)
    expect(isRithmicWeekendDowntime('ibkr', sunday)).toBe(false)
    expect(isRithmicWeekendDowntime('ig', sunday)).toBe(false)
    expect(isRithmicWeekendDowntime('thor', sunday)).toBe(false)
  })

  it('does not flag Rithmic on weekdays', () => {
    expect(isRithmicWeekendDowntime('rithmic', monday)).toBe(false)
    expect(isRithmicWeekendDowntime('rithmic-protocol', friday)).toBe(false)
  })

  it('treats missing services as not Rithmic', () => {
    expect(isRithmicWeekendDowntime(null, sunday)).toBe(false)
    expect(isRithmicWeekendDowntime(undefined, sunday)).toBe(false)
  })
})

describe('excludeWeekendBlockedConnections', () => {
  const connections = [
    { id: 'r1', service: 'rithmic-protocol' },
    { id: 't1', service: 'tradovate' },
    { id: 'r0', service: 'rithmic' },
    { id: 'i1', service: 'ibkr' },
  ]

  it('removes Rithmic connections on the weekend and keeps the rest', () => {
    expect(excludeWeekendBlockedConnections(connections, sunday)).toEqual([
      { id: 't1', service: 'tradovate' },
      { id: 'i1', service: 'ibkr' },
    ])
  })

  it('keeps every connection on a weekday', () => {
    expect(excludeWeekendBlockedConnections(connections, monday)).toEqual(
      connections
    )
  })

  it('returns an empty list when every connection is Rithmic on the weekend', () => {
    expect(
      excludeWeekendBlockedConnections(
        [
          { id: 'r1', service: 'rithmic-protocol' },
          { id: 'r0', service: 'rithmic' },
        ],
        saturday
      )
    ).toEqual([])
  })
})
