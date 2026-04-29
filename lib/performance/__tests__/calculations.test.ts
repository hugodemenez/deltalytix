import { computeWinRateData, computeDrawdown, computePeriodStats, type RawTrade } from '../calculations'

const t = (id: string, pnl: number, opts: Partial<RawTrade> = {}): RawTrade => ({
  id,
  instrument: opts.instrument ?? 'NQ',
  entryDate:  opts.entryDate  ?? '2024-01-15T09:30:00Z',
  closeDate:  opts.closeDate  ?? '2024-01-15T10:00:00Z',
  pnl,
  commission: opts.commission ?? 0,
  side:       opts.side       ?? 'LONG',
  timeInPosition: opts.timeInPosition ?? 30,
})

const TRADES: RawTrade[] = [
  t('1', 100),
  t('2', -50),
  t('3', 200),
  t('4', -30),
  t('5', 80, { instrument: 'ES' }),
]

describe('computeWinRateData', () => {
  it('computes overall win rate correctly', () => {
    const result = computeWinRateData(TRADES)
    expect(result.overall.trades).toBe(5)
    expect(result.overall.wins).toBe(3)
    expect(result.overall.winRate).toBeCloseTo(0.6)
  })

  it('splits by instrument', () => {
    const result = computeWinRateData(TRADES)
    const nq = result.byInstrument.find(r => r.label === 'NQ')!
    const es = result.byInstrument.find(r => r.label === 'ES')!
    expect(nq.trades).toBe(4)
    expect(es.trades).toBe(1)
    expect(es.winRate).toBe(1)
  })

  it('returns empty arrays for empty trades', () => {
    const result = computeWinRateData([])
    expect(result.overall.trades).toBe(0)
    expect(result.byInstrument).toHaveLength(0)
  })
})

describe('computeDrawdown', () => {
  it('returns zeros for empty trades', () => {
    const dd = computeDrawdown([])
    expect(dd.maxDrawdown).toBe(0)
    expect(dd.points).toHaveLength(0)
  })

  it('computes max drawdown correctly', () => {
    const trades: RawTrade[] = [
      t('a', 100, { closeDate: '2024-01-01T00:00:00Z' }),
      t('b', -150, { closeDate: '2024-01-02T00:00:00Z' }),
      t('c', 50,  { closeDate: '2024-01-03T00:00:00Z' }),
    ]
    const dd = computeDrawdown(trades)
    // Peak = 100, trough = -50. Max drawdown = -150
    expect(dd.maxDrawdown).toBe(-150)
    expect(dd.peakEquity).toBe(100)
  })

  it('recovery factor is positive when profitable', () => {
    const trades: RawTrade[] = [
      t('a', 200, { closeDate: '2024-01-01T00:00:00Z' }),
      t('b', -50,  { closeDate: '2024-01-02T00:00:00Z' }),
      t('c', 100,  { closeDate: '2024-01-03T00:00:00Z' }),
    ]
    const dd = computeDrawdown(trades)
    expect(dd.recoveryFactor).toBeGreaterThan(0)
  })
})

describe('computePeriodStats', () => {
  it('returns zeroed stats for empty trades', () => {
    const s = computePeriodStats('Test', [])
    expect(s.trades).toBe(0)
    expect(s.totalPnl).toBe(0)
  })

  it('computes profit factor', () => {
    const s = computePeriodStats('Test', TRADES)
    // Gross win = 380, Gross loss = 80
    expect(s.profitFactor).toBeCloseTo(380 / 80)
  })
})
