import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type EquityChartConfig = {
  showIndividual: boolean
  showDailyPnL: boolean
  maxAccountsDisplayed: number
  dataSampling: 'all' | 'sample'
  selectedAccountsToDisplay: string[]
}

type EquityChartStore = {
  config: EquityChartConfig
  setShowIndividual: (showIndividual: boolean) => void
  setShowDailyPnL: (showDailyPnL: boolean) => void
  setMaxAccountsDisplayed: (maxAccounts: number) => void
  setSelectedAccountsToDisplay: (accounts: string[]) => void
  toggleAccountSelection: (accountNumber: string) => void
  setConfig: (config: Partial<EquityChartConfig>) => void
  resetConfig: () => void
}

const defaultConfig: EquityChartConfig = {
  showIndividual: true,
  showDailyPnL: true,
  maxAccountsDisplayed: 10,
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
      
      setMaxAccountsDisplayed: (maxAccounts) => 
        set((state) => ({ 
          config: { ...state.config, maxAccountsDisplayed: maxAccounts } 
        })),
      
      setSelectedAccountsToDisplay: (accounts) => 
        set((state) => ({ 
          config: { ...state.config, selectedAccountsToDisplay: accounts } 
        })),
      
      toggleAccountSelection: (accountNumber) => 
        set((state) => {
          const current = state.config.selectedAccountsToDisplay
          const isSelected = current.includes(accountNumber)
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