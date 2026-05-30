import { create } from 'zustand'
import { FinancialEvent } from '@/prisma/generated/prisma/browser'

type FinancialEventsStore = {
  events: FinancialEvent[]
  isLoading: boolean
  setEvents: (events: FinancialEvent[]) => void
  getEventsByDate: (date: Date) => FinancialEvent[]
  getEventsByType: (type: string) => FinancialEvent[]
  getEventsByImportance: (importance: string) => FinancialEvent[]
  setIsLoading: (value: boolean) => void
}

export const useFinancialEventsStore = create<FinancialEventsStore>()((set, get) => ({
  events: [],
  isLoading: false,

  setEvents: (events) => set({ events }),
  
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
