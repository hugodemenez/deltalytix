'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useData } from '@/context/data-provider'
import { toast } from 'sonner'
import { useI18n } from "@/locales/client"
import { Synchronization } from '@/prisma/generated/prisma/browser'

interface TradovateSyncContextType {
  // Core sync management
  performSyncForAccount: (accountId: string) => Promise<{ success: boolean; message: string } | undefined>
  performSyncForAllAccounts: () => Promise<void>
  
  // State management
  isAutoSyncing: boolean
  
  // Account management
  accounts: Synchronization[]
  loadAccounts: () => Promise<void>
  deleteAccount: (accountId: string) => Promise<void>
  
  // Auto-sync functionality
  syncInterval: number
  setSyncInterval: (interval: number) => void
  enableAutoSync: boolean
  setEnableAutoSync: (enabled: boolean) => void
}

const TradovateSyncContext = createContext<TradovateSyncContextType | undefined>(undefined)

export function TradovateSyncContextProvider({ children }: { children: ReactNode }) {
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const [accounts, setAccounts] = useState<Synchronization[]>([])
  const [syncInterval, setSyncInterval] = useState(15) // 15 minutes default
  const [enableAutoSync, setEnableAutoSync] = useState(false)

  const t = useI18n()
  const { refreshTradesOnly } = useData()

  // Normalize dates returned from API
  const normalizeSynchronization = useCallback(
    (sync: any): Synchronization => ({
      ...sync,
      lastSyncedAt: sync?.lastSyncedAt ? new Date(sync.lastSyncedAt) : null,
      tokenExpiresAt: sync?.tokenExpiresAt ? new Date(sync.tokenExpiresAt) : null,
      dailySyncTime: sync?.dailySyncTime ? new Date(sync.dailySyncTime) : null,
      createdAt: sync?.createdAt ? new Date(sync.createdAt) : new Date(),
      updatedAt: sync?.updatedAt ? new Date(sync.updatedAt) : new Date(),
    }),
    []
  )

  // Load accounts from API
  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/tradovate/synchronizations", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch Tradovate synchronizations")
      }

      const result = await response.json()
      const data = Array.isArray(result.data) ? result.data : []
      setAccounts(data.map(normalizeSynchronization))
    } catch (error) {
      console.warn('Failed to load Tradovate accounts:', error)
    }
  }, [normalizeSynchronization])

  const deleteAccount = useCallback(async (accountId: string) => {
    setAccounts(prev => prev.filter(acc => acc.accountId !== accountId))
    await fetch("/api/tradovate/synchronizations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId })
    })
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

    try {
      const runSync = async () => {
        console.log('Starting sync for account:', accountId)
        if (!account.token) {
          const errorMsg = `Token for account ${accountId} is expired`
          return errorMsg
        }

        const response = await fetch("/api/tradovate/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId })
        })

        const payload = await response.json()

        // Handle duplicate trades (already imported)
        if (payload?.message === "DUPLICATE_TRADES") {
          const message = t('tradovateSync.multiAccount.alreadyImportedTrades')
          return message
        }
        
        if (!response.ok || !payload?.success) {
          const errorMsg = payload?.message || `Sync error for account ${accountId}`

          throw new Error(errorMsg)
        }

        // Track progress
        const savedCount = payload.savedCount || 0
        const ordersCount = payload.ordersCount || 0

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
        await refreshTradesOnly({ force: false })

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

      console.error('Sync error:', error)
      return { success: false, message: errorMsg }
    }
  }, [accounts, t, refreshTradesOnly, loadAccounts])

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
        // If we don't have a token, skip this account
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
  }, [enableAutoSync, isAutoSyncing, accounts, syncInterval, performSyncForAccount]);

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
  }, [enableAutoSync])

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
      
      // Account management
      accounts,
      loadAccounts,
      deleteAccount,
      
      // Auto-sync functionality
      syncInterval,
      setSyncInterval,
      enableAutoSync,
      setEnableAutoSync,
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
