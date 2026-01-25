"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { SortingState } from "@tanstack/react-table"

interface AccountsSortingStore {
  sorting: SortingState
  setSorting: (
    next: SortingState | ((prev: SortingState) => SortingState)
  ) => void
  clearSorting: () => void
}

export const useAccountsSortingStore = create<AccountsSortingStore>()(
  persist(
    (set) => ({
      sorting: [],
      setSorting: (next) =>
        set((state) => ({
          sorting: typeof next === "function" ? next(state.sorting) : next,
        })),
      clearSorting: () => set({ sorting: [] }),
    }),
    {
      name: "accounts-sorting-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
