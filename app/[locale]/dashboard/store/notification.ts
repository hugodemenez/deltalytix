import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface NotificationState {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      setIsCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
    }),
    {
      name: "notification-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 