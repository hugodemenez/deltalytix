'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react'
import { useData } from '@/context/data-provider'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
/** Client-safe subset of Synchronization (token stripped, replaced with hasToken) */
export interface DxFeedSyncAccount {
  id: string
  userId: string
  service: string
  accountId: string
  hasToken: boolean
  accountNumbers: string[]
  lastSyncedAt: Date
  tokenExpiresAt: Date | null
  dailySyncTime: Date | null
  createdAt: Date
  updatedAt: Date
}

interface DxFeedSyncContextType {
  performSyncForAccount: (accountId: string) => Promise<{ success: boolean; message: string } | undefined>
  performSyncForAllAccounts: () => Promise<void>
  isAutoSyncing: boolean
  accounts: DxFeedSyncAccount[]
  loadAccounts: () => Promise<void>
  deleteAccount: (accountId: string) => Promise<void>
  syncInterval: number
  setSyncInterval: (interval: number) => void
  enableAutoSync: boolean
  setEnableAutoSync: (enabled: boolean) => void
}

const DxFeedSyncContext = createContext<DxFeedSyncContextType | undefined>(undefined)

export function DxFeedSyncContextProvider({ children }: { children: ReactNode }) {
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const isAutoSyncingRef = useRef(false)
  const [accounts, setAccounts] = useState<DxFeedSyncAccount[]>([])
  const [syncInterval, setSyncInterval] = useState(15)
  const [enableAutoSync, setEnableAutoSync] = useState(false)

  const t = useI18n()
  const { refreshTradesOnly } = useData()

  const normalizeSynchronization = useCallback(
    (sync: any): DxFeedSyncAccount => ({
      id: sync.id,
      userId: sync.userId,
      service: sync.service,
      accountId: sync.accountId,
      hasToken: !!sync.hasToken,
      accountNumbers: Array.isArray(sync.accountNumbers) ? sync.accountNumbers : [],
      lastSyncedAt: sync?.lastSyncedAt ? new Date(sync.lastSyncedAt) : new Date(),
      tokenExpiresAt: sync?.tokenExpiresAt ? new Date(sync.tokenExpiresAt) : null,
      dailySyncTime: sync?.dailySyncTime ? new Date(sync.dailySyncTime) : null,
      createdAt: sync?.createdAt ? new Date(sync.createdAt) : new Date(),
      updatedAt: sync?.updatedAt ? new Date(sync.updatedAt) : new Date(),
    }),
    [],
  )

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/dxfeed/synchronizations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch DxFeed synchronizations')
      }

      const result = await response.json()
      const data = Array.isArray(result.data) ? result.data : []
      setAccounts(data.map(normalizeSynchronization))
    } catch (error) {
      console.warn('Failed to load DxFeed accounts:', error)
    }
  }, [normalizeSynchronization])

  const deleteAccount = useCallback(async (accountId: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.accountId !== accountId))
    await fetch('/api/dxfeed/synchronizations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
  }, [])

  const performSyncForAccount = useCallback(
    async (accountId: string) => {
      const account = accounts.find((acc) => acc.accountId === accountId)
      if (!account) {
        return { success: false, message: `Account ${accountId} not found` }
      }

      if (!account.hasToken) {
        return { success: false, message: `Token for account ${accountId} is missing` }
      }

      try {
        const runSync = async () => {
          const response = await fetch('/api/dxfeed/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          })

          const payload = await response.json()

          if (payload?.message === 'DUPLICATE_TRADES') {
            return t('dxfeedSync.multiAccount.alreadyImportedTrades')
          }

          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || `Sync error for account ${accountId}`)
          }

          const savedCount = payload.savedCount || 0
          const tradesCount = payload.tradesCount || 0

          let successMessage: string
          if (savedCount > 0) {
            successMessage = t('dxfeedSync.multiAccount.syncCompleteForAccount', {
              savedCount,
              tradesCount,
              accountId,
            })
          } else if (tradesCount > 0) {
            successMessage = t('dxfeedSync.multiAccount.syncCompleteNoNewTradesForAccount', {
              tradesCount,
              accountId,
            })
          } else {
            successMessage = t('dxfeedSync.multiAccount.syncCompleteNoOrdersForAccount', {
              accountId,
            })
          }

          await loadAccounts()
          await refreshTradesOnly({ force: false })

          return successMessage
        }

        const promise = runSync()
        toast.promise(promise, {
          loading: t('dxfeedSync.sync.inProgress', { accountId }),
          success: (msg: string) => msg,
          error: (e) =>
            t('dxfeedSync.sync.syncFailed', {
              error: e instanceof Error ? e.message : t('dxfeedSync.sync.unknownError'),
            }),
        })
        const message: string = await promise
        return { success: true, message }
      } catch (error) {
        const errorMsg = `Sync error for account ${accountId}: ${
          error instanceof Error ? error.message : t('dxfeedSync.sync.unknownError')
        }`
        console.error('Sync error:', error)
        return { success: false, message: errorMsg }
      }
    },
    [accounts, t, refreshTradesOnly, loadAccounts],
  )

  const performSyncForAllAccounts = useCallback(async () => {
    if (isAutoSyncingRef.current) return

    isAutoSyncingRef.current = true
    setIsAutoSyncing(true)

    try {
      const validAccounts = accounts.filter((acc) => acc.hasToken)
      if (validAccounts.length === 0) return

      for (const account of validAccounts) {
        await performSyncForAccount(account.accountId)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error('Error during bulk sync:', error)
    } finally {
      isAutoSyncingRef.current = false
      setIsAutoSyncing(false)
    }
  }, [accounts, performSyncForAccount])

  const checkAndPerformSyncs = useCallback(async () => {
    if (!enableAutoSync || isAutoSyncingRef.current) return

    isAutoSyncingRef.current = true
    setIsAutoSyncing(true)

    try {
      const now = Date.now()

      for (const account of accounts) {
        if (!account.hasToken) continue

        const lastSyncTime = new Date(account.lastSyncedAt).getTime()
        const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60)

        if (minutesSinceLastSync >= syncInterval) {
          await performSyncForAccount(account.accountId)
        }
      }
    } catch (error) {
      console.warn('Error during dxfeed auto-sync check:', error)
    } finally {
      isAutoSyncingRef.current = false
      setIsAutoSyncing(false)
    }
  }, [enableAutoSync, accounts, syncInterval, performSyncForAccount])

  useEffect(() => {
    if (!enableAutoSync) return

    const intervalMs = 1 * 60 * 1000

    const intervalId = setInterval(() => {
      checkAndPerformSyncs()
    }, intervalMs)

    return () => {
      clearInterval(intervalId)
    }
  }, [enableAutoSync, checkAndPerformSyncs])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  return (
    <DxFeedSyncContext.Provider
      value={{
        performSyncForAccount,
        performSyncForAllAccounts,
        isAutoSyncing,
        accounts,
        loadAccounts,
        deleteAccount,
        syncInterval,
        setSyncInterval,
        enableAutoSync,
        setEnableAutoSync,
      }}
    >
      {children}
    </DxFeedSyncContext.Provider>
  )
}

export function useDxFeedSyncContext() {
  const context = useContext(DxFeedSyncContext)
  if (context === undefined) {
    throw new Error('useDxFeedSyncContext must be used within a DxFeedSyncContextProvider')
  }
  return context
}
