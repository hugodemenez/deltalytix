'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { useData } from '@/context/data-provider'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'

export interface RithmicProtocolSyncAccount {
  id: string
  userId: string
  service: string
  accountId: string
  hasToken: boolean
  systemName?: string | null
  username?: string | null
  accountNumbers: string[]
  lastSyncedAt: Date
  dailySyncTime: Date | null
  createdAt: Date
  updatedAt: Date
}

interface SyncApiPayload {
  success?: boolean
  message?: string
  errorParams?: Record<string, string | number>
  savedCount?: number
  tradesCount?: number
}

interface RithmicProtocolSyncContextType {
  performSyncForAccount: (
    accountId: string,
  ) => Promise<{ success: boolean; message: string } | undefined>
  performSyncForAllAccounts: () => Promise<void>
  isAutoSyncing: boolean
  accounts: RithmicProtocolSyncAccount[]
  loadAccounts: () => Promise<void>
  deleteAccount: (accountId: string) => Promise<void>
  syncInterval: number
  setSyncInterval: (interval: number) => void
  enableAutoSync: boolean
  setEnableAutoSync: (enabled: boolean) => void
}

const RithmicProtocolSyncContext = createContext<
  RithmicProtocolSyncContextType | undefined
>(undefined)

export function RithmicProtocolSyncContextProvider({
  children,
}: {
  children: ReactNode
}) {
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const isAutoSyncingRef = useRef(false)
  const [accounts, setAccounts] = useState<RithmicProtocolSyncAccount[]>([])
  const [syncInterval, setSyncInterval] = useState(15)
  const [enableAutoSync, setEnableAutoSync] = useState(false)

  const t = useI18n()
  const { refreshTradesOnly } = useData()

  const normalizeSynchronization = useCallback(
    (sync: Record<string, unknown>): RithmicProtocolSyncAccount => ({
      id: String(sync.id),
      userId: String(sync.userId),
      service: String(sync.service),
      accountId: String(sync.accountId),
      hasToken: !!sync.hasToken,
      systemName: (sync.systemName as string | null) ?? null,
      username: (sync.username as string | null) ?? null,
      accountNumbers: Array.isArray(sync.accountNumbers)
        ? (sync.accountNumbers as string[])
        : [],
      lastSyncedAt: sync.lastSyncedAt
        ? new Date(sync.lastSyncedAt as string)
        : new Date(),
      dailySyncTime: sync.dailySyncTime
        ? new Date(sync.dailySyncTime as string)
        : null,
      createdAt: sync.createdAt ? new Date(sync.createdAt as string) : new Date(),
      updatedAt: sync.updatedAt ? new Date(sync.updatedAt as string) : new Date(),
    }),
    [],
  )

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/rithmic-protocol/synchronizations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to fetch synchronizations')
      const result = await response.json()
      const data = Array.isArray(result.data) ? result.data : []
      setAccounts(data.map(normalizeSynchronization))
    } catch (error) {
      console.warn('Failed to load Rithmic Protocol accounts:', error)
      toast.error(t('rithmicProtocolSync.errors.LOAD_SYNCHRONIZATIONS_FAILED'))
    }
  }, [normalizeSynchronization, t])

  const deleteAccount = useCallback(async (accountId: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.accountId !== accountId))
    await fetch('/api/rithmic-protocol/synchronizations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
  }, [])

  const performSyncForAccount = useCallback(
    async (accountId: string) => {
      const account = accounts.find((acc) => acc.accountId === accountId)
      if (!account) {
        return {
          success: false,
          message: t('rithmicProtocolSync.sync.accountNotFound'),
        }
      }
      if (!account.hasToken) {
        return {
          success: false,
          message: t('rithmicProtocolSync.sync.tokenMissing'),
        }
      }

      const toastId = toast.loading(
        t('rithmicProtocolSync.sync.inProgress', { accountId }),
      )

      try {
        const response = await fetch('/api/rithmic-protocol/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId }),
        })
        const payload = (await response.json()) as SyncApiPayload

        if (payload?.message === 'DUPLICATE_TRADES') {
          await loadAccounts()
          await refreshTradesOnly({ force: false })
          toast.success(t('rithmicProtocolSync.multiAccount.alreadyImportedTrades'), {
            id: toastId,
          })
          return { success: true, message: 'DUPLICATE_TRADES' }
        }

        if (!response.ok || !payload?.success) {
          const code = payload?.message || 'SYNC_FAILED'
          toast.error(
            // Cast keeps next-international's huge key union from exploding here.
            (t as (key: string, params?: Record<string, string | number>) => string)(
              `rithmicProtocolSync.errors.${code}`,
              {
                reason: String(payload?.errorParams?.reason ?? ''),
              },
            ),
            { id: toastId },
          )
          return { success: false, message: code }
        }

        await loadAccounts()
        await refreshTradesOnly({ force: false })

        const savedCount = payload.savedCount ?? 0
        const tradesCount = payload.tradesCount ?? 0
        if (savedCount > 0) {
          toast.success(
            t('rithmicProtocolSync.multiAccount.syncCompleteForAccount', {
              savedCount,
              tradesCount,
              accountId,
            }),
            { id: toastId },
          )
        } else if (tradesCount > 0) {
          toast.success(
            t(
              'rithmicProtocolSync.multiAccount.syncCompleteNoNewTradesForAccount',
              { tradesCount, accountId },
            ),
            { id: toastId },
          )
        } else {
          toast.success(
            t(
              'rithmicProtocolSync.multiAccount.syncCompleteNoOrdersForAccount',
              { accountId },
            ),
            { id: toastId },
          )
        }

        return { success: true, message: 'OK' }
      } catch (error) {
        console.error('Rithmic Protocol sync error:', error)
        toast.error(t('rithmicProtocolSync.errors.SYNC_FAILED'), { id: toastId })
        return { success: false, message: 'SYNC_FAILED' }
      }
    },
    [accounts, loadAccounts, refreshTradesOnly, t],
  )

  const performSyncForAllAccounts = useCallback(async () => {
    if (isAutoSyncingRef.current) return
    isAutoSyncingRef.current = true
    setIsAutoSyncing(true)
    try {
      for (const account of accounts) {
        if (account.hasToken) {
          await performSyncForAccount(account.accountId)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    } finally {
      isAutoSyncingRef.current = false
      setIsAutoSyncing(false)
    }
  }, [accounts, performSyncForAccount])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    if (!enableAutoSync) return
    const intervalMs = 60_000
    const timer = setInterval(() => {
      if (isAutoSyncingRef.current) return
      const now = Date.now()
      for (const account of accounts) {
        if (!account.hasToken) continue
        const elapsedMin =
          (now - new Date(account.lastSyncedAt).getTime()) / 60_000
        if (elapsedMin >= syncInterval) {
          void performSyncForAccount(account.accountId)
          break
        }
      }
    }, intervalMs)
    return () => clearInterval(timer)
  }, [accounts, enableAutoSync, performSyncForAccount, syncInterval])

  return (
    <RithmicProtocolSyncContext.Provider
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
    </RithmicProtocolSyncContext.Provider>
  )
}

export function useRithmicProtocolSyncContext() {
  const ctx = useContext(RithmicProtocolSyncContext)
  if (!ctx) {
    throw new Error(
      'useRithmicProtocolSyncContext must be used within RithmicProtocolSyncContextProvider',
    )
  }
  return ctx
}
