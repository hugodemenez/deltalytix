import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface NewsFilterState {
  importance: number
  setImportance: (value: number) => void
}

export const useNewsFilterStore = create<NewsFilterState>()(
  persist(
    (set) => ({
      importance: 0,
      setImportance: (value) => set({ importance: value }),
    }),
    {
      name: "news-filter-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 