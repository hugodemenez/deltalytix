import { create } from 'zustand'
import { Trade as PrismaTrade } from '@prisma/client'
import { persist } from 'zustand/middleware'
import { StoreApi, UseBoundStore } from 'zustand'

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    ; (store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }

  return store
}

interface DateRange {
  from: Date
  to: Date
}

interface TickRange {
  min: number | undefined
  max: number | undefined
}

interface PnlRange {
  min: number | undefined
  max: number | undefined
}

interface TimeRange {
  range: string | null
}

interface TickFilter {
  value: string | null
}

interface WeekdayFilter {
  day: number | null
}

interface HourFilter {
  hour: number | null
}

interface TagFilter {
  tags: string[]
}

interface TradesState {
  // Trades data
  trades: PrismaTrade[]
  setTrades: (trades: PrismaTrade[]) => void
  formattedTrades: PrismaTrade[]
  setFormattedTrades: (formattedTrades: PrismaTrade[]) => void
}

export const useTradesStore = createSelectors(create<TradesState>()(persist(set => ({
  // Initial state
  trades: [],
  setTrades: (trades: PrismaTrade[]) => set({ trades }),
  formattedTrades: [],
  setFormattedTrades: (formattedTrades: PrismaTrade[]) => set({ formattedTrades }),
}), {
  name: 'trades-storage',
  partialize: (state) => ({ trades: state.trades, formattedTrades: state.formattedTrades }),
})) as UseBoundStore<StoreApi<object>>)

// Helper function for time range filtering
function getTimeRangeKey(timeInPosition: number): string {
  const minutes = timeInPosition / 60 // Convert seconds to minutes
  if (minutes < 1) return 'under1min'
  if (minutes >= 1 && minutes < 5) return '1to5min'
  if (minutes >= 5 && minutes < 10) return '5to10min'
  if (minutes >= 10 && minutes < 15) return '10to15min'
  if (minutes >= 15 && minutes < 30) return '15to30min'
  if (minutes >= 30 && minutes < 60) return '30to60min'
  if (minutes >= 60 && minutes < 120) return '1to2hours'
  if (minutes >= 120 && minutes < 300) return '2to5hours'
  return 'over5hours'
} 