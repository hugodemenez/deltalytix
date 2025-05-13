import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type ImpactLevel = "low" | "medium" | "high"

interface NewsFilterState {
  impactLevels: ImpactLevel[]
  setImpactLevels: (levels: ImpactLevel[]) => void
}

export const useNewsFilterStore = create<NewsFilterState>()(
  persist(
    (set) => ({
      impactLevels: ["high"],
      setImpactLevels: (levels) => set({ impactLevels: levels }),
    }),
    {
      name: "news-filter-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 