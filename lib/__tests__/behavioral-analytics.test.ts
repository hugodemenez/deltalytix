import { describe, it, expect } from 'vitest'
import {
  detectBehavioralPatterns,
  deduplicateDetections,
  type BehavioralTradeInput,
} from '../behavioral-analytics'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeTrade(
  overrides: Partial<BehavioralTradeInput> & { id: string }
): BehavioralTradeInput {
  return {
    instrument:    'MES',
    pnl:           100,
    entryDate:     '2025-01-02T09:00:00Z',
    closeDate:     '2025-01-02T09:30:00Z',
    quantity:      1,
    entryPrice:    5000,
    closePrice:    5010,
    side:          'LONG',
    accountNumber: 'ACC001',
    tags:          [],
    ...overrides,
  }
}

// ─── detectBehavioralPatterns ─────────────────────────────────────────────────

describe('detectBehavioralPatterns', () => {
  // ── Empty / trivial ────────────────────────────────────────────────────────

  it('returns [] for empty input', () => {
    expect(detectBehavioralPatterns([])).toEqual([])
  })

  it('returns [] for a single trade', () => {
    expect(detectBehavioralPatterns([makeTrade({ id: 't1' })])).toEqual([])
  })

  // ── REVENGE_TRADING ────────────────────────────────────────────────────────

  describe('REVENGE_TRADING', () => {
    it('detects revenge trade: loss → same instrument rapid reentry with qty spike', () => {
      const trades: BehavioralTradeInput[] = [
        makeTrade({
          id:        't1',
          pnl:       -200,
          closeDate: '2025-01-02T09:30:00Z',
        }),
        makeTrade({
          id:        't2',
          quantity:  3,                        // avgQty=2, so 3 >= 2*1.5=3 ✓
          pnl:       -300,
          entryDate: '2025-01-02T09:35:00Z',  // 5 min gap ≤ 15 ✓
          closeDate: '2025-01-02T09:45:00Z',
        }),
      ]

      const results = detectBehavioralPatterns(trades)
      const revenge = results.find((r) => r.type === 'REVENGE_TRADING')
      expect(revenge).toBeDefined()
      expect(revenge?.tradeIds).toContain('t1')
      expect(revenge?.tradeIds).toContain('t2')
      expect(revenge?.severity).toBe('HIGH')
    })

    it('does NOT detect revenge trade when gap > 15 min', () => {
      const trades: BehavioralTradeInput[] = [
        makeTrade({ id: 't1', pnl: -200, closeDate: '2025-01-02T09:00:00Z' }),
        makeTrade({
          id:        't2',
          quantity:  4,
          pnl:       -300,
          entryDate: '2025-01-02T09:20:00Z',  // 20 min gap > 15 ✗
          closeDate: '2025-01-02T09:30:00Z',
        }),
      ]
      const results  = detectBehavioralPatterns(trades)
      const revenge  = results.find((r) => r.type === 'REVENGE_TRADING')
      expect(revenge).toBeUndefined()
    })

    it('does NOT detect revenge trade when different instrument', () => {
      const trades: BehavioralTradeInput[] = [
        makeTrade({ id: 't1', instrument: 'NQ', pnl: -200, closeDate: '2025-01-02T09:00:00Z' }),
        makeTrade({
          id:         't2',
          instrument: 'ES',  // different ✗
          quantity:   4,
          pnl:        -300,
          entryDate:  '2025-01-02T09:05:00Z',
          closeDate:  '2025-01-02T09:15:00Z',
        }),
      ]
      const results = detectBehavioralPatterns(trades)
      expect(results.find((r) => r.type === 'REVENGE_TRADING')).toBeUndefined()
    })
  })

  // ── FOMO ──────────────────────────────────────────────────────────────────

  describe('FOMO', () => {
    it('detects FOMO: oversized quick entry with big loss', () => {
      const baseTrades = Array.from({ length: 4 }, (_, i) =>
        makeTrade({ id: `base${i}`, pnl: 50, quantity: 1 })
      )

      const fomoTrade = makeTrade({
        id:        'fomo1',
        quantity:  3,                        // avgQty~1, spike ≥ 1.5 ✓
        pnl:       -300,                     // big loss ✓
        entryDate: '2025-01-02T10:00:00Z',
        closeDate: '2025-01-02T10:05:00Z',
      })

      const prev = makeTrade({
        id:        'prev',
        pnl:       -10,
        closeDate: '2025-01-02T09:55:00Z',   // 5 min gap ≤ 10 ✓
      })

      const results = detectBehavioralPatterns([...baseTrades, prev, fomoTrade])
      expect(results.find((r) => r.type === 'FOMO')).toBeDefined()
    })
  })

  // ── OVERCONFIDENCE ────────────────────────────────────────────────────────

  describe('OVERCONFIDENCE', () => {
    it('detects overconfidence after 3+ wins + qty spike on loss', () => {
      const wins = Array.from({ length: 3 }, (_, i) =>
        makeTrade({ id: `w${i}`, pnl: 100, quantity: 1 })
      )
      const bigLoss = makeTrade({
        id:       'bl',
        pnl:      -400,
        quantity: 3,    // avgQty≈1.5, 3 >= 1.5*1.75 ✓
      })

      const results      = detectBehavioralPatterns([...wins, bigLoss])
      const overconfidence = results.find((r) => r.type === 'OVERCONFIDENCE')
      expect(overconfidence).toBeDefined()
      expect(overconfidence?.metadata?.winningStreak).toBe(3)
    })

    it('does NOT flag overconfidence when streak < 3', () => {
      const wins    = Array.from({ length: 2 }, (_, i) =>
        makeTrade({ id: `w${i}`, pnl: 100, quantity: 1 })
      )
      const bigLoss = makeTrade({ id: 'bl', pnl: -400, quantity: 4 })

      const results = detectBehavioralPatterns([...wins, bigLoss])
      expect(results.find((r) => r.type === 'OVERCONFIDENCE')).toBeUndefined()
    })
  })

  // ── LOSS_CHASING ──────────────────────────────────────────────────────────

  describe('LOSS_CHASING', () => {
    it('detects loss chasing: 3 consecutive losses with escalating qty', () => {
      const trades: BehavioralTradeInput[] = [
        makeTrade({ id: 'l1', pnl: -100, quantity: 1 }),
        makeTrade({ id: 'l2', pnl: -150, quantity: 2 }),
        makeTrade({ id: 'l3', pnl: -200, quantity: 3 }),
      ]

      const results = detectBehavioralPatterns(trades)
      const chasing = results.find((r) => r.type === 'LOSS_CHASING')
      expect(chasing).toBeDefined()
      expect(chasing?.severity).toBe('HIGH')
    })

    it('does NOT detect loss chasing when qty is not escalating', () => {
      const trades: BehavioralTradeInput[] = [
        makeTrade({ id: 'l1', pnl: -100, quantity: 3 }),
        makeTrade({ id: 'l2', pnl: -150, quantity: 2 }),
        makeTrade({ id: 'l3', pnl: -200, quantity: 1 }),
      ]

      const results = detectBehavioralPatterns(trades)
      expect(results.find((r) => r.type === 'LOSS_CHASING')).toBeUndefined()
    })
  })

  // ── OVERTRADING ───────────────────────────────────────────────────────────

  describe('OVERTRADING', () => {
    it('detects overtrading when same-day count >> baseline', () => {
      // baseline: 1 trade/day for 5 days, then 10 trades on 1 day
      const normal = Array.from({ length: 5 }, (_, i) =>
        makeTrade({
          id:        `n${i}`,
          entryDate: `2025-01-0${i + 1}T09:00:00Z`,
          closeDate: `2025-01-0${i + 1}T09:30:00Z`,
        })
      )
      const spike = Array.from({ length: 10 }, (_, i) =>
        makeTrade({
          id:        `s${i}`,
          entryDate: '2025-01-10T09:00:00Z',
          closeDate: '2025-01-10T09:30:00Z',
          pnl:       -50,
        })
      )

      const results = detectBehavioralPatterns([...normal, ...spike])
      expect(results.find((r) => r.type === 'OVERTRADING')).toBeDefined()
    })
  })

  // ── Score ordering ────────────────────────────────────────────────────────

  it('returns detections sorted by score descending', () => {
    const trades: BehavioralTradeInput[] = [
      makeTrade({ id: 'l1', pnl: -100, quantity: 1 }),
      makeTrade({ id: 'l2', pnl: -150, quantity: 2 }),
      makeTrade({ id: 'l3', pnl: -200, quantity: 3 }),
    ]
    const results = detectBehavioralPatterns(trades)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })
})

// ─── deduplicateDetections ────────────────────────────────────────────────────

describe('deduplicateDetections', () => {
  it('keeps the higher-scored detection when two share a tradeId', () => {
    const a: import('../behavioral-analytics').BehavioralPatternDetection = {
      type: 'REVENGE_TRADING', tradeIds: ['t1', 't2'], severity: 'HIGH',
      score: 90, title: 'A', description: '', estimatedLoss: 100, confidence: 0.9,
    }
    const b: import('../behavioral-analytics').BehavioralPatternDetection = {
      type: 'FOMO', tradeIds: ['t2'], severity: 'MEDIUM',
      score: 70, title: 'B', description: '', estimatedLoss: 50, confidence: 0.7,
    }

    const result = deduplicateDetections([b, a]) // intentionally unordered
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('REVENGE_TRADING')
  })

  it('allows OVERTRADING to coexist with same tradeIds', () => {
    const a: import('../behavioral-analytics').BehavioralPatternDetection = {
      type: 'REVENGE_TRADING', tradeIds: ['t1'], severity: 'HIGH',
      score: 90, title: 'A', description: '', estimatedLoss: 100, confidence: 0.9,
    }
    const b: import('../behavioral-analytics').BehavioralPatternDetection = {
      type: 'OVERTRADING', tradeIds: ['t1'], severity: 'MEDIUM',
      score: 65, title: 'B', description: '', estimatedLoss: 0, confidence: 0.78,
    }

    const result = deduplicateDetections([a, b])
    expect(result.length).toBe(2)
  })

  it('keeps all unique detections when no tradeIds overlap', () => {
    const detections = ['t1', 't2', 't3'].map((id, i) => ({
      type: 'FOMO' as const,
      tradeIds: [id],
      severity: 'MEDIUM' as const,
      score: 70 - i * 5,
      title: '', description: '', estimatedLoss: 0, confidence: 0.7,
    }))

    expect(deduplicateDetections(detections).length).toBe(3)
  })
})
