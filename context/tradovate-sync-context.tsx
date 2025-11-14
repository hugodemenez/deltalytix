'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useData } from '@/context/data-provider'
import { toast } from 'sonner'
import { useI18n } from "@/locales/client"
import { useTradesStore } from '@/store/trades-store'
import { getTradovateTrades, removeTradovateToken, getTradovateSynchronizations } from '@/app/[locale]/dashboard/components/import/tradovate/actions'
import { Synchronization } from '@prisma/client'

interface TradovateSyncProgress {
  accountId: string
  isSyncing: boolean
  isComplete: boolean
  ordersProcessed: number
  tradesSaved: number
  error?: string
  startTime?: number
  endTime?: number
}


interface TradovateSyncContextType {
  // Core sync management
  performSyncForAccount: (accountId: string) => Promise<{ success: boolean; message: string } | undefined>
  performSyncForAllAccounts: () => Promise<void>
  
  // State management
  isAutoSyncing: boolean
  syncProgress: Record<string, TradovateSyncProgress>
  
  // Account management
  accounts: Synchronization[]
  loadAccounts: () => Promise<void>
  deleteAccount: (accountId: string) => Promise<void>
  
  // Auto-sync functionality
  syncInterval: number
  setSyncInterval: (interval: number) => void
  enableAutoSync: boolean
  setEnableAutoSync: (enabled: boolean) => void
  
  // Utilities
  resetSyncProgress: () => void
}

const TradovateSyncContext = createContext<TradovateSyncContextType | undefined>(undefined)

export function TradovateSyncContextProvider({ children }: { children: ReactNode }) {
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<Record<string, TradovateSyncProgress>>({})
  const [accounts, setAccounts] = useState<Synchronization[]>([])
  const [syncInterval, setSyncInterval] = useState(15) // 15 minutes default
  const [enableAutoSync, setEnableAutoSync] = useState(false)

  const t = useI18n()
  const { refreshTrades } = useData()
  const trades = useTradesStore((state) => state.trades)

  // Reset sync progress
  const resetSyncProgress = useCallback(() => {
    setSyncProgress({})
  }, [])

  // Load accounts from database
  const loadAccounts = useCallback(async () => {
    try {
      const result = await getTradovateSynchronizations()
      if (!result.error && result.synchronizations) {
        setAccounts(result.synchronizations)
      }
    } catch (error) {
      console.warn('Failed to load Tradovate accounts:', error)
    }
  }, [])

  // Update sync progress for an account
  const updateSyncProgress = useCallback((accountId: string, updates: Partial<TradovateSyncProgress>) => {
    setSyncProgress(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        ...updates
      }
    }))
  }, [])

  const deleteAccount = useCallback(async (accountId: string) => {
    setAccounts(prev => prev.filter(acc => acc.accountId !== accountId))
    await removeTradovateToken(accountId)
  }, [])

  // Perform sync for a specific account
  const performSyncForAccount = useCallback(async (accountId: string) => {
    const account = accounts.find(acc => acc.accountId === accountId)
    if (!account) {
      const errorMsg = `Account ${accountId} not found`
      return { success: false, message: errorMsg }
    }

    if (!account.token) {
      const errorMsg = `Token for account ${accountId} is expired`
      return { success: false, message: errorMsg }
    }

    // Check if already syncing
    const currentProgress = syncProgress[accountId]
    if (currentProgress?.isSyncing) {
      const errorMsg = `Account ${accountId} is already syncing`
      return { success: false, message: errorMsg }
    }

    try {
      const runSync = async () => {
        // Initialize sync progress
        updateSyncProgress(accountId, {
          isSyncing: true,
          isComplete: false,
          ordersProcessed: 0,
          tradesSaved: 0,
          startTime: Date.now(),
          error: undefined
        })

        console.log('Starting sync for account:', accountId)
        if (!account.token) {
          const errorMsg = `Token for account ${accountId} is expired`
          return errorMsg
        }

        const result = await getTradovateTrades(account.token)

      // Handle duplicate trades (already imported)
      if (result.error === "DUPLICATE_TRADES") {
        const message = t('tradovateSync.multiAccount.alreadyImportedTrades')
        
        updateSyncProgress(accountId, {
          isSyncing: false,
          isComplete: true,
          endTime: Date.now(),
          error: message
        })

        await refreshTrades()
        return message
      }
      
      if (result.error) {
        const errorMsg = `Sync error for account ${accountId}: ${result.error}`

        updateSyncProgress(accountId, {
          isSyncing: false,
          isComplete: true,
          endTime: Date.now(),
          error: result.error
        })
        throw new Error(result.error)
      }

      // Track progress
      const savedCount = result.savedCount || 0
      const ordersCount = result.ordersCount || 0
      
      updateSyncProgress(accountId, {
        isSyncing: false,
        isComplete: true,
        ordersProcessed: ordersCount,
        tradesSaved: savedCount,
        endTime: Date.now()
      })

      console.log(`Sync complete for ${accountId}: ${savedCount} trades saved, ${ordersCount} orders processed`)

      // Show success message
      let successMessage: string
      if (savedCount > 0) {
        successMessage = t('tradovateSync.multiAccount.syncCompleteForAccount', { 
          savedCount, 
          ordersCount, 
          accountId 
        })
      } else if (ordersCount > 0) {
        successMessage = t('tradovateSync.multiAccount.syncCompleteNoNewTradesForAccount', { 
          ordersCount, 
          accountId 
        })
      } else {
        successMessage = t('tradovateSync.multiAccount.syncCompleteNoOrdersForAccount', { 
          accountId 
        })
      }

      // Refresh the accounts list to update last sync time
      await loadAccounts()
      await refreshTrades()

      return successMessage
      }

      const promise = runSync()
      toast.promise(promise, {
        loading: t('tradovateSync.sync.inProgress', { accountId }),
        success: (msg: string) => msg,
        error: (e) => t('tradovateSync.sync.syncFailed', { error: e instanceof Error ? e.message : t('tradovateSync.sync.unknownError') })
      })
      const message: string = await promise
      return { success: true, message: message }

    } catch (error) {
      const errorMsg = `Sync error for account ${accountId}: ${error instanceof Error ? error.message : t('tradovateSync.sync.unknownError')}`

      updateSyncProgress(accountId, {
        isSyncing: false,
        isComplete: true,
        endTime: Date.now(),
        error: errorMsg
      })

      console.error('Sync error:', error)
      return { success: false, message: errorMsg }
    }
  }, [accounts, syncProgress, updateSyncProgress, t, refreshTrades, loadAccounts])

  // Perform sync for all accounts
  const performSyncForAllAccounts = useCallback(async () => {
    if (isAutoSyncing) {
      return
    }

    setIsAutoSyncing(true)
    
    try {
      const validAccounts = accounts.filter(acc => acc.token)
      if (validAccounts.length === 0) {
        return
      }

      // Sync accounts sequentially to avoid overwhelming the API
      for (const account of validAccounts) {
        await performSyncForAccount(account.accountId)
        // Small delay between accounts
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

    } catch (error) {
      console.error('Error during bulk sync:', error)
    } finally {
      setIsAutoSyncing(false)
    }
  }, [isAutoSyncing, accounts, performSyncForAccount])

  // Auto-sync checking
  const checkAndPerformSyncs = useCallback(async () => {
    if (!enableAutoSync || isAutoSyncing) return

    try {
      const now = Date.now()
      
      // Check each account's last sync time
      for (const account of accounts) {
        if (!account.token) continue

        const lastSyncTime = new Date(account.lastSyncedAt).getTime()
        const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60)

        if (minutesSinceLastSync >= syncInterval) {
          console.log(`Auto-sync triggered for account ${account.accountId}`)
          await performSyncForAccount(account.accountId)
        }
      }
    } catch (error) {
      console.warn('Error during tradovate auto-sync check:', error)
    }
  }, [enableAutoSync, isAutoSyncing, accounts, syncInterval, performSyncForAccount])

  // Auto-sync checking interval
  useEffect(() => {
    if (!enableAutoSync) return

    const intervalMs = 1 * 60 * 1000  // 1 minute

    const intervalId = setInterval(() => {
      checkAndPerformSyncs()
    }, intervalMs)

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId)
    }
  }, [enableAutoSync, checkAndPerformSyncs])

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  return (
    <TradovateSyncContext.Provider value={{
      // Core sync management
      performSyncForAccount,
      performSyncForAllAccounts,
      
      // State management
      isAutoSyncing,
      syncProgress,
      
      // Account management
      accounts,
      loadAccounts,
      deleteAccount,
      
      // Auto-sync functionality
      syncInterval,
      setSyncInterval,
      enableAutoSync,
      setEnableAutoSync,
      
      // Utilities
      resetSyncProgress,
    }}>
      {children}
    </TradovateSyncContext.Provider>
  )
}

export function useTradovateSyncContext() {
  const context = useContext(TradovateSyncContext)
  if (context === undefined) {
    throw new Error('useTradovateSyncContext must be used within a TradovateSyncContextProvider')
  }
  return context
}
