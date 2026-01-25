"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { ExpandedState } from "@tanstack/react-table"

interface AccountsGroupExpansionStore {
  expanded: ExpandedState
  setExpanded: (expanded: ExpandedState) => void
  resetExpanded: () => void
}

export const useAccountsGroupExpansionStore =
  create<AccountsGroupExpansionStore>()(
    persist(
      (set) => ({
        expanded: {},
        setExpanded: (expanded) => set({ expanded }),
        resetExpanded: () => set({ expanded: {} }),
      }),
      {
        name: "accounts-group-expansion-store",
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
