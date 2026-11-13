import { create } from 'zustand'
import { FinancialEvent } from '@/prisma/generated/prisma/browser'
import {
  financialEventIdentity,
  financialEventRangeCovers,
  type LoadedFinancialEventRange,
} from '@/lib/financial-events/date-window'

export type FinancialEventsRangeInput = {
  start: Date
  end: Date
  lang: string
}

export type FinancialEventLoadError = {
  attempts: number
  message: string
  startMs: number
  endMs: number
  lang: string
}

type FinancialEventsStore = {
  events: FinancialEvent[]
  loadedRanges: LoadedFinancialEventRange[]
  /** True after dashboard bootstrap records the window it already fetched. */
  initialized: boolean
  isLoading: boolean
  /** Windows whose follow-up fetch failed. These are not in `loadedRanges`. */
  loadErrors: Record<string, FinancialEventLoadError>
  setEvents: (events: FinancialEvent[], range: FinancialEventsRangeInput) => void
  mergeEvents: (events: FinancialEvent[], range: FinancialEventsRangeInput) => void
  noteLoadFailure: (key: string, range: FinancialEventsRangeInput, message: string) => void
  clearLoadError: (key: string) => void
  /** Reset attempts so a failed window is fetched again. */
  retryFinancialEventLoad: (key: string) => void
  getEventsByDate: (date: Date) => FinancialEvent[]
  getEventsByType: (type: string) => FinancialEvent[]
  getEventsByImportance: (importance: string) => FinancialEvent[]
  setIsLoading: (value: boolean) => void
}

function toLoadedRange(range: FinancialEventsRangeInput): LoadedFinancialEventRange {
  return {
    startMs: range.start.getTime(),
    endMs: range.end.getTime(),
    lang: range.lang,
  }
}

function eventTime(event: FinancialEvent): number {
  return new Date(event.date).getTime()
}

/**
 * Incoming wins. Match on title + date + lang + timezone, not `id`: the
 * investing cron deletes a window and inserts it again, which assigns new
 * uuids to the same news.
 */
export function mergeFinancialEvents(
  existing: FinancialEvent[],
  incoming: FinancialEvent[],
): FinancialEvent[] {
  if (incoming.length === 0) return existing
  const byKey = new Map(existing.map((event) => [financialEventIdentity(event), event]))
  for (const event of incoming) byKey.set(financialEventIdentity(event), event)
  return [...byKey.values()]
}

function outsideRange(event: FinancialEvent, range: LoadedFinancialEventRange): boolean {
  if (event.lang !== range.lang) return true
  const time = eventTime(event)
  return time < range.startMs || time > range.endMs
}

function rangesDisjoint(
  existing: LoadedFinancialEventRange,
  next: LoadedFinancialEventRange,
): boolean {
  if (existing.lang !== next.lang) return true
  return existing.endMs < next.startMs || existing.startMs > next.endMs
}

export const useFinancialEventsStore = create<FinancialEventsStore>()((set, get) => ({
  events: [],
  loadedRanges: [],
  initialized: false,
  isLoading: false,
  loadErrors: {},

  setEvents: (events, range) =>
    set((state) => {
      const loaded = toLoadedRange(range)
      const keptEvents = state.events.filter((event) => outsideRange(event, loaded))
      const keptRanges = state.loadedRanges.filter((existing) =>
        rangesDisjoint(existing, loaded),
      )
      const loadErrors: Record<string, FinancialEventLoadError> = {}
      for (const [key, error] of Object.entries(state.loadErrors)) {
        const covered =
          error.lang === loaded.lang &&
          loaded.startMs <= error.startMs &&
          loaded.endMs >= error.endMs
        if (!covered) loadErrors[key] = error
      }
      return {
        events: mergeFinancialEvents(keptEvents, events),
        loadedRanges: [loaded, ...keptRanges],
        initialized: true,
        loadErrors,
      }
    }),

  mergeEvents: (events, range) =>
    set((state) => {
      const loaded = toLoadedRange(range)
      return {
        events: mergeFinancialEvents(state.events, events),
        loadedRanges: financialEventRangeCovers(state.loadedRanges, loaded)
          ? state.loadedRanges
          : [...state.loadedRanges, loaded],
      }
    }),

  noteLoadFailure: (key, range, message) =>
    set((state) => {
      const previous = state.loadErrors[key]
      return {
        loadErrors: {
          ...state.loadErrors,
          [key]: {
            attempts: (previous?.attempts ?? 0) + 1,
            message,
            startMs: range.start.getTime(),
            endMs: range.end.getTime(),
            lang: range.lang,
          },
        },
      }
    }),

  clearLoadError: (key) =>
    set((state) => {
      if (!state.loadErrors[key]) return state
      const loadErrors = { ...state.loadErrors }
      delete loadErrors[key]
      return { loadErrors }
    }),

  retryFinancialEventLoad: (key) =>
    set((state) => {
      const previous = state.loadErrors[key]
      if (!previous) return state
      return {
        loadErrors: {
          ...state.loadErrors,
          [key]: { ...previous, attempts: 0 },
        },
      }
    }),

  getEventsByDate: (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return get().events.filter(event =>
      event.date.toISOString().split('T')[0] === dateStr
    )
  },

  getEventsByType: (type) => {
    return get().events.filter(event => event.type === type)
  },

  getEventsByImportance: (importance) => {
    return get().events.filter(event => event.importance === importance)
  },

  setIsLoading: (value) => set({ isLoading: value }),
}))
