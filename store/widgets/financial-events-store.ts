import { create } from 'zustand'
import { FinancialEvent } from '@/prisma/generated/prisma/browser'
import {
  financialEventRangeCovers,
  type LoadedFinancialEventRange,
} from '@/lib/financial-events/date-window'

export type FinancialEventsRangeInput = {
  start: Date
  end: Date
  lang: string
}

type FinancialEventsStore = {
  events: FinancialEvent[]
  loadedRanges: LoadedFinancialEventRange[]
  /** True after dashboard bootstrap records the window it already fetched. */
  initialized: boolean
  isLoading: boolean
  setEvents: (events: FinancialEvent[], range: FinancialEventsRangeInput) => void
  mergeEvents: (events: FinancialEvent[], range: FinancialEventsRangeInput) => void
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

function mergeById(existing: FinancialEvent[], incoming: FinancialEvent[]): FinancialEvent[] {
  if (incoming.length === 0) return existing
  const byId = new Map(existing.map((event) => [event.id, event]))
  for (const event of incoming) byId.set(event.id, event)
  return [...byId.values()]
}

export const useFinancialEventsStore = create<FinancialEventsStore>()((set, get) => ({
  events: [],
  loadedRanges: [],
  initialized: false,
  isLoading: false,

  setEvents: (events, range) =>
    set({
      events,
      loadedRanges: [toLoadedRange(range)],
      initialized: true,
    }),

  mergeEvents: (events, range) =>
    set((state) => {
      const loaded = toLoadedRange(range)
      return {
        events: mergeById(state.events, events),
        loadedRanges: financialEventRangeCovers(state.loadedRanges, loaded)
          ? state.loadedRanges
          : [...state.loadedRanges, loaded],
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
