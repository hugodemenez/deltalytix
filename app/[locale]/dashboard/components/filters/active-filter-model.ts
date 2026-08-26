import {
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

type DateRangeLike = {
  from?: Date
  to?: Date
}

export type ActiveFilterState = {
  dateRange?: DateRangeLike
  pnlRange?: { min?: number; max?: number }
  weekdayFilter?: { days?: number[] }
  accountNumbers?: string[]
  instruments?: string[]
  tagFilter?: { tags?: string[] }
}

export function countActiveFilters(state: ActiveFilterState): number {
  let count = 0
  if (state.dateRange?.from) count += 1
  if (state.pnlRange?.min !== undefined || state.pnlRange?.max !== undefined) {
    count += 1
  }
  if (state.weekdayFilter?.days?.length) count += 1
  count += state.accountNumbers?.length ?? 0
  count += state.instruments?.length ?? 0
  count += state.tagFilter?.tags?.length ?? 0
  return count
}

export function hasActiveFilters(state: ActiveFilterState): boolean {
  return countActiveFilters(state) > 0
}

export type FilterSectionKey =
  | "dateRange"
  | "tags"
  | "instruments"
  | "accounts"
  | "pnl"

export function countSectionFilters(
  section: FilterSectionKey,
  state: ActiveFilterState
): number {
  switch (section) {
    case "dateRange":
      return (
        (state.dateRange?.from ? 1 : 0) +
        (state.weekdayFilter?.days?.length ? 1 : 0)
      )
    case "tags":
      return state.tagFilter?.tags?.length ?? 0
    case "instruments":
      return state.instruments?.length ?? 0
    case "accounts":
      return state.accountNumbers?.length ?? 0
    case "pnl":
      return state.pnlRange?.min !== undefined ||
        state.pnlRange?.max !== undefined
        ? 1
        : 0
  }
}

function sameRange(
  range: DateRangeLike | undefined,
  from: Date,
  to: Date
): boolean {
  if (!range?.from) return false
  const end = range.to ?? range.from
  return isSameDay(range.from, from) && isSameDay(end, to)
}

export function labelDateRange(
  dateRange: DateRangeLike | undefined,
  labels: {
    thisWeek: string
    thisMonth: string
    lastThreeMonths: string
    lastSixMonths: string
  },
  formatCustom: (range: DateRangeLike) => string | null
): string | null {
  if (!dateRange?.from) return null
  const now = new Date()
  if (
    sameRange(dateRange, startOfWeek(now), endOfWeek(now))
  ) {
    return labels.thisWeek
  }
  if (
    sameRange(dateRange, startOfMonth(now), endOfMonth(now))
  ) {
    return labels.thisMonth
  }
  if (sameRange(dateRange, subMonths(now, 3), now)) {
    return labels.lastThreeMonths
  }
  if (sameRange(dateRange, subMonths(now, 6), now)) {
    return labels.lastSixMonths
  }
  return formatCustom(dateRange)
}
