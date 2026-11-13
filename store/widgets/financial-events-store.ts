import { create } from 'zustand'
import { FinancialEvent } from '@/prisma/generated/prisma/browser'
import {
  mergeFinancialEvents,
  windowCovers,
  type FinancialEventDateWindow,
} from '@/lib/financial-events/date-window'

type FinancialEventsStore = {
  events: FinancialEvent[]
  /** Ranges already loaded. Empty until the dashboard user-data fetch lands. */
  loadedWindows: FinancialEventDateWindow[]
  isLoading: boolean
  setEvents: (events: FinancialEvent[], window?: FinancialEventDateWindow) => void
  mergeEvents: (events: FinancialEvent[], window: FinancialEventDateWindow) => void
  getEventsByDate: (date: Date) => FinancialEvent[]
  getEventsByType: (type: string) => FinancialEvent[]
  getEventsByImportance: (importance: string) => FinancialEvent[]
  setIsLoading: (value: boolean) => void
}

export const useFinancialEventsStore = create<FinancialEventsStore>()((set, get) => ({
  events: [],
  loadedWindows: [],
  isLoading: false,

  setEvents: (events, window) => set({
    events,
    loadedWindows: window ? [window] : [],
  }),

  mergeEvents: (events, window) => set((state) => ({
    events: mergeFinancialEvents(state.events, events),
    loadedWindows: windowCovers(state.loadedWindows, window)
      ? state.loadedWindows
      : [...state.loadedWindows, window],
  })),
  
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
