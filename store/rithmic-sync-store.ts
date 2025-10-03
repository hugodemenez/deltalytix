import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SyncInterval = 5 | 15 | 30 | 60

interface AccountProgress {
  ordersProcessed: number
  daysProcessed: number
  totalDays: number
  isComplete: boolean
  error?: string
  currentDate?: string
  processedDates?: string[]
  currentDayNumber?: number
  lastProcessedDate?: string
  current: number
  total: number
}

interface ProcessingStats {
  totalAccountsAvailable: number
  accountsProcessed: number
  isComplete: boolean
}

interface RithmicSyncState {
  // Sync settings
  syncInterval: SyncInterval
  setSyncInterval: (interval: SyncInterval) => void

  // Message handling
  lastMessage: any
  messageHistory: any[]
  setLastMessage: (message: any) => void
  addMessageToHistory: (message: any) => void
  clearMessageHistory: () => void

  // Progress tracking
  accountsProgress: Record<string, AccountProgress>
  currentAccount: string | null
  processingStats: ProcessingStats
  setAccountsProgress: (progress: Record<string, AccountProgress>) => void
  updateAccountProgress: (accountId: string, progress: Partial<AccountProgress>) => void
  setCurrentAccount: (accountId: string | null) => void
  setProcessingStats: (stats: ProcessingStats) => void
  resetProcessingState: () => void

  // Account management
  selectedAccounts: string[]
  availableAccounts: { account_id: string; fcm_id: string }[]
  setSelectedAccounts: (accounts: string[]) => void
  setAvailableAccounts: (accounts: { account_id: string; fcm_id: string }[]) => void

  // State management
  step: 'credentials' | 'select-accounts' | 'processing'
  setStep: (step: 'credentials' | 'select-accounts' | 'processing') => void

  // Auto-sync functionality
  isAutoSyncing: boolean
  setIsAutoSyncing: (syncing: boolean) => void
}

export const useRithmicSyncStore = create<RithmicSyncState>()(
  persist(
    (set, get) => ({
      // Sync settings
      syncInterval: 60, // Default to 60 minutes
      setSyncInterval: (interval) => set({ syncInterval: interval }),

      // Message handling
      lastMessage: null,
      messageHistory: [],
      setLastMessage: (message) => set({ lastMessage: message }),
      addMessageToHistory: (message) => set((state) => ({
        messageHistory: [...state.messageHistory, message]
      })),
      clearMessageHistory: () => set({ messageHistory: [] }),

      // Progress tracking
      accountsProgress: {},
      currentAccount: null,
      processingStats: {
        totalAccountsAvailable: 0,
        accountsProcessed: 0,
        isComplete: false
      },
      setAccountsProgress: (progress) => set({ accountsProgress: progress }),
      updateAccountProgress: (accountId, progress) => set((state) => ({
        accountsProgress: {
          ...state.accountsProgress,
          [accountId]: {
            ...(state.accountsProgress[accountId] ?? {}),
            ...progress
          }
        }
      })),
      setCurrentAccount: (accountId) => set({ currentAccount: accountId }),
      setProcessingStats: (stats) => set({ processingStats: stats }),
      resetProcessingState: () => set({
        processingStats: {
          totalAccountsAvailable: 0,
          accountsProcessed: 0,
          isComplete: false
        },
        accountsProgress: {},
        currentAccount: null
      }),

      // Account management
      selectedAccounts: [],
      availableAccounts: [],
      setSelectedAccounts: (accounts) => set({ selectedAccounts: accounts }),
      setAvailableAccounts: (accounts) => set({ availableAccounts: accounts }),

      // State management
      step: 'credentials',
      setStep: (step) => set({ step }),

      // Auto-sync functionality
      isAutoSyncing: false,
      setIsAutoSyncing: (syncing) => set({ isAutoSyncing: syncing }),
    }),
    {
      name: 'rithmic-sync-settings',
      // Only persist sync settings, not runtime state
      partialize: (state) => ({
        syncInterval: state.syncInterval
      })
    }
  )
)
