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
  /** Human label of the Rithmic connect point, e.g. "Core (Chicago)". */
  gatewayLabel?: string | null
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
  /** Connection externalIds (usernames) currently mid-sync. */
  syncingAccountIds: ReadonlySet<string>
  isAccountSyncing: (accountId: string) => boolean
  accounts: RithmicProtocolSyncAccount[]
  loadAccounts: () => Promise<RithmicProtocolSyncAccount[]>
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
  const accountsRef = useRef<RithmicProtocolSyncAccount[]>([])
  const [syncingAccountIds, setSyncingAccountIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const syncingAccountIdsRef = useRef(new Set<string>())
  const [syncInterval, setSyncInterval] = useState(15)
  const [enableAutoSync, setEnableAutoSync] = useState(false)

  const beginAccountSync = useCallback((accountId: string) => {
    syncingAccountIdsRef.current.add(accountId)
    setSyncingAccountIds(new Set(syncingAccountIdsRef.current))
  }, [])

  const endAccountSync = useCallback((accountId: string) => {
    syncingAccountIdsRef.current.delete(accountId)
    setSyncingAccountIds(new Set(syncingAccountIdsRef.current))
  }, [])

  const isAccountSyncing = useCallback(
    (accountId: string) => syncingAccountIds.has(accountId),
    [syncingAccountIds],
  )

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
      gatewayLabel: (sync.gatewayLabel as string | null) ?? null,
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
      const next = data.map(normalizeSynchronization)
      // Keep the ref in sync immediately so a post-connect sync can resolve the
      // new connection before React re-renders with setAccounts.
      accountsRef.current = next
      setAccounts(next)
      return next
    } catch (error) {
      console.warn('Failed to load Rithmic Protocol accounts:', error)
      toast.error(t('rithmicProtocolSync.errors.LOAD_SYNCHRONIZATIONS_FAILED'))
      return accountsRef.current
    }
  }, [normalizeSynchronization, t])

  const deleteAccount = useCallback(async (accountId: string) => {
    accountsRef.current = accountsRef.current.filter(
      (acc) => acc.accountId !== accountId,
    )
    setAccounts(accountsRef.current)
    await fetch('/api/rithmic-protocol/synchronizations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
  }, [])

  const performSyncForAccount = useCallback(
    async (accountId: string) => {
      const account = accountsRef.current.find((acc) => acc.accountId === accountId)
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
      if (syncingAccountIdsRef.current.has(accountId)) {
        return { success: true, message: 'SYNC_IN_PROGRESS' }
      }

      beginAccountSync(accountId)
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
          )
          return { success: false, message: code }
        }

        await loadAccounts()
        await refreshTradesOnly({ force: false })
        return { success: true, message: 'OK' }
      } catch (error) {
        console.error('Rithmic Protocol sync error:', error)
        toast.error(t('rithmicProtocolSync.errors.SYNC_FAILED'))
        return { success: false, message: 'SYNC_FAILED' }
      } finally {
        endAccountSync(accountId)
      }
    },
    [beginAccountSync, endAccountSync, loadAccounts, refreshTradesOnly, t],
  )

  /**
   * One Protocol connection login stores many trading accounts; each sync already
   * fetches fills for every accountId on that connection. Sync All therefore runs
   * once per connection (username), not once per trading account — and connections
   * sync in parallel with per-row loading state (no promise toasts).
   */
  const performSyncForAllAccounts = useCallback(async () => {
    if (isAutoSyncingRef.current) return
    isAutoSyncingRef.current = true
    setIsAutoSyncing(true)
    try {
      const targets = accountsRef.current.filter((account) => account.hasToken)
      await Promise.all(
        targets.map((account) => performSyncForAccount(account.accountId)),
      )
    } finally {
      isAutoSyncingRef.current = false
      setIsAutoSyncing(false)
    }
  }, [performSyncForAccount])

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
        syncingAccountIds,
        isAccountSyncing,
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
