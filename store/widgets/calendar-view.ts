import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type ViewMode = "daily" | "weekly"

interface CalendarViewState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  selectedDate: Date | null
  setSelectedDate: (date: Date | null) => void
  selectedWeekDate: Date | null
  setSelectedWeekDate: (date: Date | null) => void
}

export const useCalendarViewStore = create<CalendarViewState>()(
  persist(
    (set) => ({
      viewMode: "daily",
      setViewMode: (mode) => set({ viewMode: mode }),
      selectedDate: null,
      setSelectedDate: (date) => set({ selectedDate: date }),
      selectedWeekDate: null,
      setSelectedWeekDate: (date) => set({ selectedWeekDate: date })
    }),
    {
      name: "calendar-view-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 