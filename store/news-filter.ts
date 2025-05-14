import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type ImpactLevel = "low" | "medium" | "high"

interface NewsFilterState {
  impactLevels: ImpactLevel[]
  setImpactLevels: (levels: ImpactLevel[]) => void
  selectedCountries: string[]
  setSelectedCountries: (countries: string[]) => void
  toggleCountry: (country: string) => void
  selectAllCountries: (countries: string[]) => void
  clearCountries: () => void
}

export const useNewsFilterStore = create<NewsFilterState>()(
  persist(
    (set, get) => ({
      impactLevels: ["high"],
      setImpactLevels: (levels) => set({ impactLevels: levels }),
      selectedCountries: [],
      setSelectedCountries: (countries) => set({ selectedCountries: countries }),
      toggleCountry: (country) => set((state) => ({
        selectedCountries: state.selectedCountries.includes(country)
          ? state.selectedCountries.filter(c => c !== country)
          : [...state.selectedCountries, country]
      })),
      selectAllCountries: (countries) => set((state) => ({
        selectedCountries: state.selectedCountries.length === countries.length ? [] : countries
      })),
      clearCountries: () => set({ selectedCountries: [] })
    }),
    {
      name: "news-filter-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 