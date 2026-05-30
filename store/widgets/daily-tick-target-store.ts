import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface DailyTickTarget {
  date: string // YYYY-MM-DD format
  target: number
  current: number
  positive: number // Positive ticks/points
  negative: number // Negative ticks/points
  total: number // Total absolute ticks/points
}

interface DailyTickTargetStore {
  targets: DailyTickTarget[]
  isLoading: boolean
  displayMode: 'ticks' | 'points' // Toggle between ticks and points
  
  // Actions
  setTarget: (date: string, target: number) => void
  updateCurrent: (date: string, current: number, positive: number, negative: number, total: number) => void
  getTarget: (date: string) => DailyTickTarget | undefined
  getTodayTarget: () => DailyTickTarget | undefined
  getTodayProgress: () => { current: number; target: number; percentage: number; positive: number; negative: number; total: number }
  setIsLoading: (value: boolean) => void
  setDisplayMode: (mode: 'ticks' | 'points') => void
  convertToDisplayValue: (ticks: number) => number
  convertFromDisplayValue: (value: number) => number
  getDisplayUnit: () => string
  getProgress: (date: string) => { current: number; target: number; percentage: number; positive: number; negative: number; total: number } | undefined
}

export const useDailyTickTargetStore = create<DailyTickTargetStore>()(
  persist(
    (set, get) => ({
      targets: [],
      isLoading: false,
      displayMode: 'ticks',

      setTarget: (date, target) => set((state) => {
        const existingIndex = state.targets.findIndex(t => t.date === date)
        
        if (existingIndex >= 0) {
          // Update existing target
          const updatedTargets = [...state.targets]
          updatedTargets[existingIndex] = {
            ...updatedTargets[existingIndex],
            target
          }
          return { targets: updatedTargets }
        } else {
          // Add new target
          return {
            targets: [...state.targets, { date, target, current: 0, positive: 0, negative: 0, total: 0 }]
          }
        }
      }),

      updateCurrent: (date, current, positive, negative, total) => set((state) => {
        const existingIndex = state.targets.findIndex(t => t.date === date)
        
        if (existingIndex >= 0) {
          // Update existing current value
          const updatedTargets = [...state.targets]
          updatedTargets[existingIndex] = {
            ...updatedTargets[existingIndex],
            current,
            positive,
            negative,
            total
          }
          return { targets: updatedTargets }
        } else {
          // Add new entry with current value
          return {
            targets: [...state.targets, { date, target: 0, current, positive, negative, total }]
          }
        }
      }),

      getTarget: (date) => {
        return get().targets.find(t => t.date === date)
      },

      getTodayTarget: () => {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        return get().targets.find(t => t.date === today)
      },

      getTodayProgress: () => {
        const today = new Date().toISOString().split('T')[0]
        const target = get().targets.find(t => t.date === today)
        
        if (!target) {
          return { current: 0, target: 0, percentage: 0, positive: 0, negative: 0, total: 0 }
        }
        
        const percentage = target.target > 0 ? (target.current / target.target) * 100 : 0
        return {
          current: target.current,
          target: target.target,
          percentage: Math.min(percentage, 100), // Cap at 100%
          positive: target.positive,
          negative: target.negative,
          total: target.total
        }
      },

      setIsLoading: (value) => set({ isLoading: value }),
      
      setDisplayMode: (mode) => set({ displayMode: mode }),
      
      convertToDisplayValue: (ticks) => {
        const state = get()
        return state.displayMode === 'points' ? ticks / 4 : ticks
      },
      
      convertFromDisplayValue: (value) => {
        const state = get()
        return state.displayMode === 'points' ? value * 4 : value
      },
      
      getDisplayUnit: () => {
        const state = get()
        return state.displayMode === 'points' ? 'point' : 'tick'
      },

      getProgress: (date) => {
        const target = get().targets.find(t => t.date === date)
        if (!target) return undefined
        const percentage = target.target > 0 ? (target.current / target.target) * 100 : 0
        return {
          current: target.current,
          target: target.target,
          percentage: Math.min(percentage, 100),
          positive: target.positive,
          negative: target.negative,
          total: target.total
        }
      },
    }),
    {
      name: 'daily-tick-target-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
) 