import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ToolbarSettings {
  autoHide: boolean
  autoHideDelay: number // milliseconds
  opacity: number // 0-1
  showThreshold: number // pixels from edge to show toolbar
}

interface ToolbarSettingsStore {
  settings: ToolbarSettings
  setAutoHide: (autoHide: boolean) => void
  setAutoHideDelay: (delay: number) => void
  setOpacity: (opacity: number) => void
  setShowThreshold: (threshold: number) => void
  resetSettings: () => void
}

const defaultSettings: ToolbarSettings = {
  autoHide: false,
  autoHideDelay: 800, // 0.8 seconds
  opacity: 0.8,
  showThreshold: 100 // pixels from edge
}

export const useToolbarSettingsStore = create<ToolbarSettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      setAutoHide: (autoHide) => set((state) => ({
        settings: { ...state.settings, autoHide }
      })),
      
      setAutoHideDelay: (autoHideDelay) => set((state) => ({
        settings: { ...state.settings, autoHideDelay }
      })),
      
      setOpacity: (opacity) => set((state) => ({
        settings: { ...state.settings, opacity }
      })),
      
      setShowThreshold: (showThreshold) => set((state) => ({
        settings: { ...state.settings, showThreshold }
      })),
      
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'toolbar-settings-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
) 