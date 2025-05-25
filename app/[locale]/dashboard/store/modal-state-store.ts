import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface ModalStateState {
  accountGroupBoardOpen: boolean
  setAccountGroupBoardOpen: (open: boolean) => void
}

export const useModalStateStore = create<ModalStateState>()(
  persist(
    (set) => ({
      accountGroupBoardOpen: false,
      setAccountGroupBoardOpen: (open) => set({ accountGroupBoardOpen: open }),
    }),
    {
      name: "modal-state-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 