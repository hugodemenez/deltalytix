"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type AccountsView = "cards" | "table"

interface AccountsViewPreferenceStore {
  view: AccountsView
  setView: (view: AccountsView) => void
}

export const useAccountsViewPreferenceStore =
  create<AccountsViewPreferenceStore>()(
    persist(
      (set) => ({
        view: "cards",
        setView: (view) => set({ view }),
      }),
      {
        name: "accounts-view-preference-store",
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
