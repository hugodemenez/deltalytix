export type BehavioralPatternType =
  | 'REVENGE_TRADING'
  | 'FOMO'
  | 'OVERCONFIDENCE'
  | 'LOSS_CHASING'
  | 'OVERTRADING'

export interface BehavioralPatternDetection {
  type:          BehavioralPatternType
  tradeIds:      string[]
  severity:      'LOW' | 'MEDIUM' | 'HIGH'
  score:         number
  title:         string
  description:   string
  estimatedLoss: number
  confidence:    number
  metadata?:     Record<string, unknown>
}

export interface BehavioralTradeInput {
  id:            string
  instrument:    string
  pnl:           number
  entryDate:     string
  closeDate:     string
  quantity:      number
  entryPrice:    number
  closePrice:    number
  side?:         string | null
  accountNumber?: string
  tags?:         string[]
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDate(value: string): Date {
  return new Date(value)
}

function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 60_000)
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid    = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// ─── deduplication ───────────────────────────────────────────────────────────

/**
 * Remove lower-priority detections that share trade IDs with a higher-scored one.
 * E.g. FOMO and REVENGE_TRADING can both fire on the same trade pair;
 * we keep the one with the higher score.
 */
export function deduplicateDetections(
  detections: BehavioralPatternDetection[]
): BehavioralPatternDetection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score)
  const usedIds = new Set<string>()
  const result: BehavioralPatternDetection[] = []

  for (const detection of sorted) {
    const overlaps = detection.tradeIds.some((id) => usedIds.has(id))
    // Allow OVERTRADING to coexist — it operates at day granularity
    if (!overlaps || detection.type === 'OVERTRADING') {
      result.push(detection)
      detection.tradeIds.forEach((id) => usedIds.add(id))
    }
  }

  return result
}

// ─── main detector ────────────────────────────────────────────────────────────

export function detectBehavioralPatterns(
  trades: BehavioralTradeInput[]
): BehavioralPatternDetection[] {
  const sorted = [...trades].sort(
    (a, b) => toDate(a.closeDate).getTime() - toDate(b.closeDate).getTime()
  )

  const detections: BehavioralPatternDetection[] = []
  const absPnls     = sorted.map((t) => Math.abs(t.pnl))
  const medianAbsPnl = median(absPnls) || 1
  const avgQty       = average(sorted.map((t) => t.quantity)) || 1

  // ── Revenge trading + FOMO ───────────────────────────────────────────────
  for (let i = 1; i < sorted.length; i++) {
    const prev    = sorted[i - 1]
    const current = sorted[i]

    const prevClose    = toDate(prev.closeDate)
    const currentEntry = toDate(current.entryDate)
    const gapMinutes   = minutesBetween(prevClose, currentEntry)

    const sameInstrument  = prev.instrument === current.instrument
    const prevLoss        = prev.pnl < 0
    const currentQtySpike = current.quantity >= avgQty * 1.5
    const rapidReentry    = gapMinutes <= 15

    if (prevLoss && sameInstrument && rapidReentry && currentQtySpike) {
      detections.push({
        type:     'REVENGE_TRADING',
        tradeIds: [prev.id, current.id],
        severity: current.quantity >= avgQty * 2 ? 'HIGH' : 'MEDIUM',
        score:    Math.min(
          100,
          55 +
          Math.round((15 - gapMinutes) * 2) +
          Math.round((current.quantity / avgQty) * 10)
        ),
        title:       'Revenge trading detected',
        description: 'A new position was opened shortly after a losing trade on the same instrument with increased size.',
        estimatedLoss: current.pnl < 0
          ? Math.abs(current.pnl)
          : Math.abs(prev.pnl) * 0.3,
        confidence: 0.86,
        metadata: {
          gapMinutes,
          previousLoss: prev.pnl,
          quantity:     current.quantity,
          avgQty,
          instrument:   current.instrument,
        },
      })
    }

    if (
      currentQtySpike &&
      current.pnl < 0 &&
      Math.abs(current.pnl) >= medianAbsPnl * 1.4 &&
      gapMinutes <= 10
    ) {
      detections.push({
        type:     'FOMO',
        tradeIds: [current.id],
        severity: current.quantity >= avgQty * 2 ? 'HIGH' : 'MEDIUM',
        score:    Math.min(100, 50 + Math.round((current.quantity / avgQty) * 15)),
        title:       'FOMO entry pattern',
        description: 'Oversized trade entered quickly and closed with a larger-than-usual loss, which often indicates chasing the move.',
        estimatedLoss: Math.abs(current.pnl),
        confidence: 0.72,
        metadata: {
          quantity:     current.quantity,
          avgQty,
          pnl:          current.pnl,
          medianAbsPnl,
          instrument:   current.instrument,
        },
      })
    }
  }

  // ── Overconfidence ───────────────────────────────────────────────────────
  let positiveStreak = 0
  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i]
    if (trade.pnl > 0) {
      positiveStreak += 1
    } else {
      if (positiveStreak >= 3 && trade.quantity >= avgQty * 1.75) {
        detections.push({
          type:     'OVERCONFIDENCE',
          tradeIds: [trade.id],
          severity: trade.quantity >= avgQty * 2.5 ? 'HIGH' : 'MEDIUM',
          score:    Math.min(100, 60 + positiveStreak * 6),
          title:       'Overconfidence after winning streak',
          description: 'Trade size expanded significantly after multiple wins and resulted in a loss.',
          estimatedLoss: Math.abs(trade.pnl),
          confidence: 0.83,
          metadata: {
            winningStreak: positiveStreak,
            quantity:      trade.quantity,
            avgQty,
            pnl:           trade.pnl,
          },
        })
      }
      positiveStreak = 0
    }
  }

  // ── Loss chasing ─────────────────────────────────────────────────────────
  const losingTrades = sorted.filter((t) => t.pnl < 0)
  if (losingTrades.length >= 3) {
    const last3 = losingTrades.slice(-3)
    const escalating =
      last3[1].quantity > last3[0].quantity &&
      last3[2].quantity > last3[1].quantity

    if (escalating) {
      detections.push({
        type:     'LOSS_CHASING',
        tradeIds: last3.map((t) => t.id),
        severity: 'HIGH',
        score:    88,
        title:       'Loss chasing sequence',
        description: 'Three consecutive losing trades showed increasing position size, a classic loss-chasing pattern.',
        estimatedLoss: last3.reduce((sum, t) => sum + Math.abs(t.pnl), 0),
        confidence: 0.89,
        metadata: {
          quantities: last3.map((t) => t.quantity),
          pnls:       last3.map((t) => t.pnl),
        },
      })
    }
  }

  // ── Overtrading ──────────────────────────────────────────────────────────
  const sameDayCounts = sorted.reduce<Record<string, number>>((acc, trade) => {
    const day  = trade.closeDate.slice(0, 10)
    acc[day]   = (acc[day] ?? 0) + 1
    return acc
  }, {})

  const avgTradesPerDay = average(Object.values(sameDayCounts)) || 1

  Object.entries(sameDayCounts).forEach(([day, count]) => {
    if (count >= Math.max(8, avgTradesPerDay * 1.8)) {
      const dayTrades = sorted.filter((t) => t.closeDate.slice(0, 10) === day)
      const dayPnl    = dayTrades.reduce((sum, t) => sum + t.pnl, 0)
      detections.push({
        type:     'OVERTRADING',
        tradeIds: dayTrades.map((t) => t.id),
        severity: count >= avgTradesPerDay * 2.5 ? 'HIGH' : 'MEDIUM',
        score:    Math.min(100, 45 + Math.round((count / avgTradesPerDay) * 20)),
        title:       'Overtrading day',
        description: 'Trade count for the day was materially above baseline, which can signal reduced selectivity.',
        estimatedLoss: dayPnl < 0 ? Math.abs(dayPnl) : 0,
        confidence: 0.78,
        metadata: {
          day,
          tradeCount:      count,
          avgTradesPerDay,
          dayPnl,
        },
      })
    }
  })

  return detections.sort((a, b) => b.score - a.score)
}
