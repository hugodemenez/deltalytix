import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface ModalStateState {
  accountGroupBoardOpen: boolean
  setAccountGroupBoardOpen: (open: boolean) => void
  billingSheetOpen: boolean
  setBillingSheetOpen: (open: boolean) => void
}

export const useModalStateStore = create<ModalStateState>()(
  persist(
    (set) => ({
      accountGroupBoardOpen: false,
      setAccountGroupBoardOpen: (open) => set({ accountGroupBoardOpen: open }),
      billingSheetOpen: false,
      setBillingSheetOpen: (open) => set({ billingSheetOpen: open }),
    }),
    {
      name: "modal-state-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist account-group board; billing sheet should not reopen on refresh.
      partialize: (state) => ({
        accountGroupBoardOpen: state.accountGroupBoardOpen,
      }),
    }
  )
) 