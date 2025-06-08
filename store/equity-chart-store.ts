import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type EquityChartConfig = {
  showIndividual: boolean
  showDailyPnL: boolean
  maxAccountsDisplayed: number
  dataSampling: 'all' | 'sample'
}

type EquityChartStore = {
  config: EquityChartConfig
  setShowIndividual: (showIndividual: boolean) => void
  setShowDailyPnL: (showDailyPnL: boolean) => void
  setConfig: (config: Partial<EquityChartConfig>) => void
  resetConfig: () => void
}

const defaultConfig: EquityChartConfig = {
  showIndividual: true,
  showDailyPnL: true,
  maxAccountsDisplayed: 8,
  dataSampling: 'all',
}

export const useEquityChartStore = create<EquityChartStore>()(
  persist(
    (set, get) => ({
      config: defaultConfig,

      setShowIndividual: (showIndividual) => 
        set((state) => ({ 
          config: { ...state.config, showIndividual } 
        })),
      
      setShowDailyPnL: (showDailyPnL) => 
        set((state) => ({ 
          config: { ...state.config, showDailyPnL } 
        })),
      
      setConfig: (newConfig) => 
        set((state) => ({ 
          config: { ...state.config, ...newConfig } 
        })),
      
      resetConfig: () => set({ config: defaultConfig }),
    }),
    {
      name: 'equity-chart-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
) 