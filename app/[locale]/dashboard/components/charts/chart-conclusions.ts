import { peakIndex } from "./chart-glance"

export type EmptyConclusion = { kind: "empty" }

export type DailyPnlConclusion =
  | EmptyConclusion
  | { kind: "greenDays"; green: number; total: number }
  | { kind: "redDays"; red: number; total: number }

export function dailyPnlConclusion(values: number[]): DailyPnlConclusion {
  if (values.length === 0) return { kind: "empty" }
  const green = values.filter((value) => value > 0).length
  const red = values.filter((value) => value < 0).length
  if (green >= red) {
    return { kind: "greenDays", green, total: values.length }
  }
  return { kind: "redDays", red, total: values.length }
}

export type NamedValueConclusion =
  | EmptyConclusion
  | { kind: "best"; label: string }
  | { kind: "worst"; label: string }

export function namedSignedConclusion(
  items: Array<{ label: string; value: number }>,
): NamedValueConclusion {
  const active = items.filter((item) => item.value !== 0)
  if (active.length === 0) return { kind: "empty" }

  const strongest = peakIndex(active, (item) => item.value, "max")
  const weakest = peakIndex(active, (item) => item.value, "min")
  const best = active[strongest]
  const worst = active[weakest]

  if (Math.abs(best.value) >= Math.abs(worst.value)) {
    return { kind: "best", label: best.label }
  }
  return { kind: "worst", label: worst.label }
}

export type CountPeakConclusion =
  | EmptyConclusion
  | { kind: "peak"; label: string }

export function countPeakConclusion(
  items: Array<{ label: string; count: number }>,
): CountPeakConclusion {
  const active = items.filter((item) => item.count > 0)
  if (active.length === 0) return { kind: "empty" }
  const index = peakIndex(active, (item) => item.count, "max")
  return { kind: "peak", label: active[index].label }
}

export type ShareConclusion =
  | EmptyConclusion
  | { kind: "share"; percent: number }

export function shareConclusion(part: number, whole: number): ShareConclusion {
  if (whole <= 0) return { kind: "empty" }
  return { kind: "share", percent: Math.round((part / whole) * 100) }
}
