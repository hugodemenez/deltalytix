import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SyncInterval = 5 | 15 | 30 | 60

interface RithmicSyncState {
  syncInterval: SyncInterval
  setSyncInterval: (interval: SyncInterval) => void
}

export const useRithmicSyncStore = create<RithmicSyncState>()(
  persist(
    (set) => ({
      syncInterval: 60, // Default to 60 minutes
      setSyncInterval: (interval) => set({ syncInterval: interval }),
    }),
    {
      name: 'rithmic-sync-settings',
    }
  )
)
