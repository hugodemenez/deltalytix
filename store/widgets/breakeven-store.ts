import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { BreakevenRange, DEFAULT_BREAKEVEN_RANGE } from '@/types/breakeven'

type BreakevenStore = {
  range: BreakevenRange
  setRange: (range: BreakevenRange) => void
  reset: () => void
}

const normalizeRange = (range: BreakevenRange): BreakevenRange => {
  const min = Number.isFinite(range.min) ? range.min : DEFAULT_BREAKEVEN_RANGE.min
  const max = Number.isFinite(range.max) ? range.max : DEFAULT_BREAKEVEN_RANGE.max
  return min <= max ? { min, max } : DEFAULT_BREAKEVEN_RANGE
}

export const useBreakevenStore = create<BreakevenStore>()(
  persist(
    (set) => ({
      range: DEFAULT_BREAKEVEN_RANGE,

      setRange: (range) => set({ range: normalizeRange(range) }),
      reset: () => set({ range: DEFAULT_BREAKEVEN_RANGE }),
    }),
    {
      name: 'deltalytix-breakeven-store',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<BreakevenStore> | undefined)?.range
        return {
          ...currentState,
          ...(persistedState as object),
          range: persisted ? normalizeRange(persisted) : currentState.range,
        }
      },
    }
  )
)
