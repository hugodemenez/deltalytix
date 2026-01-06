import { create } from 'zustand'
import { TickDetails } from '@/prisma/generated/prisma/browser'
import { persist, createJSONStorage } from 'zustand/middleware'

type TickDetailsStore = {
  tickDetails: Record<string, TickDetails>
  isLoading: boolean
  setTickDetails: (tickDetails: TickDetails[]) => void
  getTickDetails: (ticker: string) => TickDetails | undefined
  setIsLoading: (value: boolean) => void
}

export const useTickDetailsStore = create<TickDetailsStore>()(
  persist(
    (set, get) => ({
      tickDetails: {},
      isLoading: false,

      setTickDetails: (tickDetails) => set({
        tickDetails: tickDetails.reduce((acc, detail) => ({
          ...acc,
          [detail.ticker]: detail
        }), {})
      }),

      getTickDetails: (ticker) => get().tickDetails[ticker],

      setIsLoading: (value) => set({ isLoading: value }),
    }),
    {
      name: 'tick-details-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
