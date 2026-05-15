import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type BreakevenRange = {
  min: number
  max: number
}

type BreakevenStore = {
  range: BreakevenRange
  setRange: (range: BreakevenRange) => void
  setMin: (min: number) => void
  setMax: (max: number) => void
  reset: () => void
}

const defaultRange: BreakevenRange = {
  min: 0,
  max: 0,
}

export const useBreakevenStore = create<BreakevenStore>()(
  persist(
    (set) => ({
      range: defaultRange,

      setRange: (range) => set({ range }),

      setMin: (min) =>
        set((state) => ({
          range: { ...state.range, min },
        })),

      setMax: (max) =>
        set((state) => ({
          range: { ...state.range, max },
        })),

      reset: () => set({ range: defaultRange }),
    }),
    {
      name: 'deltalytix-breakeven-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
