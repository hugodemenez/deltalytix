import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MAX_ACCOUNTS_DISPLAYED } from '@/lib/equity-chart'

// How many accounts may be selected is not configurable: it is fixed by the
// equity chart's line palette. The cap is enforced on every write below, so
// persisted state can never hold more accounts than the chart can draw.
type EquityChartConfig = {
  showIndividual: boolean
  showDailyPnL: boolean
  dataSampling: 'all' | 'sample'
  selectedAccountsToDisplay: string[]
}

type EquityChartStore = {
  config: EquityChartConfig
  setShowIndividual: (showIndividual: boolean) => void
  setShowDailyPnL: (showDailyPnL: boolean) => void
  setSelectedAccountsToDisplay: (accounts: string[]) => void
  toggleAccountSelection: (accountNumber: string) => void
  setConfig: (config: Partial<EquityChartConfig>) => void
  resetConfig: () => void
}

const defaultConfig: EquityChartConfig = {
  showIndividual: true,
  showDailyPnL: true,
  dataSampling: 'all',
  selectedAccountsToDisplay: [],
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
      
      setSelectedAccountsToDisplay: (accounts) =>
        set((state) => ({
          config: {
            ...state.config,
            selectedAccountsToDisplay: accounts.slice(0, MAX_ACCOUNTS_DISPLAYED),
          },
        })),

      toggleAccountSelection: (accountNumber) =>
        set((state) => {
          const current = state.config.selectedAccountsToDisplay
          const isSelected = current.includes(accountNumber)
          // Selecting past the cap is refused, not queued: the chart cannot draw
          // the extra line, so accepting the click would be a lie.
          if (!isSelected && current.length >= MAX_ACCOUNTS_DISPLAYED) {
            return state
          }
          const newSelection = isSelected
            ? current.filter(acc => acc !== accountNumber)
            : [...current, accountNumber]
          return {
            config: { ...state.config, selectedAccountsToDisplay: newSelection }
          }
        }),
      
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