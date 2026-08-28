import { create } from 'zustand'

export type DashboardHomeTab = 'widgets' | 'table' | 'accounts'

interface DashboardHomeTabsState {
  activeTab: DashboardHomeTab
  setActiveTab: (tab: DashboardHomeTab) => void
  homeActive: boolean
  setHomeActive: (active: boolean) => void
}

/**
 * Navbar and dashboard content are mounted in separate layout layers.
 * This small, non-persisted store keeps the centered view tabs and the
 * home tab panels synchronized without putting route data in the app shell.
 */
export const useDashboardHomeTabsStore = create<DashboardHomeTabsState>()(
  (set) => ({
    activeTab: 'widgets',
    setActiveTab: (activeTab) => set({ activeTab }),
    homeActive: false,
    setHomeActive: (homeActive) => set({ homeActive }),
  })
)
