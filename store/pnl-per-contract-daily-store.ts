import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface PnLPerContractDailyConfig {
  selectedInstrument: string
}

interface PnLPerContractDailyStore {
  config: PnLPerContractDailyConfig
  
  setSelectedInstrument: (instrument: string) => void
  setConfig: (newConfig: Partial<PnLPerContractDailyConfig>) => void
  resetConfig: () => void
}

const defaultConfig: PnLPerContractDailyConfig = {
  selectedInstrument: ''
}

export const usePnLPerContractDailyStore = create<PnLPerContractDailyStore>()(
  persist(
    (set) => ({
      config: defaultConfig,

      setSelectedInstrument: (selectedInstrument) => 
        set((state) => ({ 
          config: { ...state.config, selectedInstrument } 
        })),
      
      setConfig: (newConfig) => 
        set((state) => ({ 
          config: { ...state.config, ...newConfig } 
        })),
      
      resetConfig: () => set({ config: defaultConfig }),
    }),
    {
      name: 'pnl-per-contract-daily-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
