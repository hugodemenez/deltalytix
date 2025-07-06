import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface DailyTickTarget {
  date: string // YYYY-MM-DD format
  target: number
  current: number
}

interface DailyTickTargetStore {
  targets: DailyTickTarget[]
  isLoading: boolean
  
  // Actions
  setTarget: (date: string, target: number) => void
  updateCurrent: (date: string, current: number) => void
  getTarget: (date: string) => DailyTickTarget | undefined
  getTodayTarget: () => DailyTickTarget | undefined
  getTodayProgress: () => { current: number; target: number; percentage: number }
  setIsLoading: (value: boolean) => void
}

export const useDailyTickTargetStore = create<DailyTickTargetStore>()(
  persist(
    (set, get) => ({
      targets: [],
      isLoading: false,

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
            targets: [...state.targets, { date, target, current: 0 }]
          }
        }
      }),

      updateCurrent: (date, current) => set((state) => {
        const existingIndex = state.targets.findIndex(t => t.date === date)
        
        if (existingIndex >= 0) {
          // Update existing current value
          const updatedTargets = [...state.targets]
          updatedTargets[existingIndex] = {
            ...updatedTargets[existingIndex],
            current
          }
          return { targets: updatedTargets }
        } else {
          // Add new entry with current value
          return {
            targets: [...state.targets, { date, target: 0, current }]
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
          return { current: 0, target: 0, percentage: 0 }
        }
        
        const percentage = target.target > 0 ? (target.current / target.target) * 100 : 0
        return {
          current: target.current,
          target: target.target,
          percentage: Math.min(percentage, 100) // Cap at 100%
        }
      },

      setIsLoading: (value) => set({ isLoading: value }),
    }),
    {
      name: 'daily-tick-target-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
) 