import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type ImpactLevel = "low" | "medium" | "high"

interface NewsFilterState {
  impactLevels: ImpactLevel[]
  setImpactLevels: (levels: ImpactLevel[]) => void
  selectedCountries: string[]
  setSelectedCountries: (countries: string[]) => void
}

export const useNewsFilterStore = create<NewsFilterState>()(
  persist(
    (set) => ({
      impactLevels: ["high"],
      setImpactLevels: (levels) => set({ impactLevels: levels }),
      selectedCountries: [],
      setSelectedCountries: (countries) => set({ selectedCountries: countries })
    }),
    {
      name: "news-filter-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 