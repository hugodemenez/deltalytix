'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react'
import { useData } from '@/context/data-provider'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { DxFeedErrorCode } from '@/lib/dxfeed-errors'
import { formatDxFeedError, getDxFeedErrorToastContent } from '@/lib/dxfeed-client-messages'
import { runToastWithCopy } from '@/lib/toast-copy'
import type { DxFeedSyncStats } from '@/app/[locale]/dashboard/components/import/dxfeed/sync/dxfeed-types'

interface DxFeedSyncApiPayload {
  success?: boolean
  message?: string
  errorParams?: Record<string, string | number>
  savedCount?: number
  tradesCount?: number
  syncStats?: DxFeedSyncStats
}

interface DxFeedSynchronizationPayload {
  id?: string
  userId?: string
  service?: string
  accountId?: string
  hasToken?: boolean
  tokenExpired?: boolean
  needsReconnect?: boolean
  propFirmName?: string | null
  accountNumbers?: unknown
  lastSyncedAt?: string | Date | null
  tokenExpiresAt?: string | Date | null
  dailySyncTime?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

function normalizeSynchronizationDate(
  value: string | Date | null | undefined,
  fallback: Date | null,
): Date | null {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function buildSyncLabel(account: DxFeedSyncAccount, t: unknown): string {
  const translate = t as (key: string, params?: Record<string, string | number>) => string
  const tradingCount = account.accountNumbers.length
  if (account.propFirmName) {
    return tradingCount > 0
      ? `${account.propFirmName} (${tradingCount} ${translate('dxfeedSync.multiAccount.accountsCount')})`
      : account.propFirmName
  }
  return account.accountId
}

function buildSyncSuccessToast(
  t: unknown,
  syncLabel: string,
  payload: DxFeedSyncApiPayload,
): { title: string; description?: string } {
  const translate = t as (key: string, params?: Record<string, string | number>) => string
  const savedCount = payload.savedCount ?? 0
  const tradesCount = payload.tradesCount ?? 0
  const stats = payload.syncStats

  if (savedCount > 0) {
    return {
      title: translate('dxfeedSync.multiAccount.syncCompleteForAccount', {
        savedCount,
        tradesCount,
        accountId: syncLabel,
      }),
    }
  }

  if (tradesCount > 0) {
    return {
      title: translate('dxfeedSync.multiAccount.syncCompleteNoNewTradesForAccount', {
        tradesCount,
        accountId: syncLabel,
      }),
    }
  }

  if (stats && stats.rawTrades > 0 && stats.closedTrades === 0) {
    return {
      title: translate('dxfeedSync.sync.openOnlyTitle', {
        accountId: syncLabel,
        raw: stats.rawTrades,
        open: stats.openTradesSkipped,
      }),
      description: translate('dxfeedSync.sync.openOnlyDescription'),
    }
  }

  if (stats && stats.rawTrades === 0 && stats.fetchFailures === 0) {
    return {
      title: translate('dxfeedSync.sync.noTradesInRangeTitle', { accountId: syncLabel }),
      description: translate('dxfeedSync.sync.noTradesInRangeDescription'),
    }
  }

  return {
    title: translate('dxfeedSync.multiAccount.syncCompleteNoOrdersForAccount', {
      accountId: syncLabel,
    }),
    description:
      stats && stats.fetchFailures > 0
        ? translate('dxfeedSync.sync.partialFetchWarning', {
            failures: stats.fetchFailures,
            total: stats.tradingAccounts,
          })
        : undefined,
  }
}
/** Client-safe subset of Synchronization (token stripped, replaced with hasToken) */
export interface DxFeedSyncAccount {
  id: string
  userId: string
  service: string
  accountId: string
  hasToken: boolean
  /** True when saved credentials exist but the DxFeed session is no longer valid */
  tokenExpired?: boolean
  /** True when the saved credentials cannot be mapped to a supported prop firm. */
  needsReconnect?: boolean
  propFirmName?: string | null
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
  loadAccounts: () => Promise<boolean>
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
    (sync: DxFeedSynchronizationPayload): DxFeedSyncAccount => ({
      id: sync.id ?? '',
      userId: sync.userId ?? '',
      service: sync.service ?? 'dxfeed',
      accountId: sync.accountId ?? '',
      hasToken: !!sync.hasToken,
      tokenExpired: !!sync.tokenExpired,
      needsReconnect: !!sync.needsReconnect,
      propFirmName: sync.propFirmName ?? null,
      accountNumbers: Array.isArray(sync.accountNumbers)
        ? sync.accountNumbers.filter((value): value is string => typeof value === 'string')
        : [],
      lastSyncedAt: normalizeSynchronizationDate(sync.lastSyncedAt, new Date())!,
      tokenExpiresAt: normalizeSynchronizationDate(sync.tokenExpiresAt, null),
      dailySyncTime: normalizeSynchronizationDate(sync.dailySyncTime, null),
      createdAt: normalizeSynchronizationDate(sync.createdAt, new Date())!,
      updatedAt: normalizeSynchronizationDate(sync.updatedAt, new Date())!,
    }),
    [],
  )

  const loadAccounts = useCallback(async function loadDxFeedAccounts(): Promise<boolean> {
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
      return true
    } catch (error) {
      console.warn('Failed to load DxFeed accounts:', error)
      toast.error(formatDxFeedError(t, 'LOAD_SYNCHRONIZATIONS_FAILED'), {
        description: t('dxfeedSync.errors.hintContactSupport'),
        action: {
          label: t('common.retry'),
          onClick: () => {
            void loadDxFeedAccounts()
          },
        },
      })
      return false
    }
  }, [normalizeSynchronization, t])

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
        return { success: false, message: t('dxfeedSync.sync.accountNotFound') }
      }

      if (account.tokenExpired || account.needsReconnect || !account.hasToken) {
        return { success: false, message: t('dxfeedSync.sync.tokenMissing') }
      }

      try {
        const syncLabel = buildSyncLabel(account, t)

        const message = await runToastWithCopy(
          async () => {
            const response = await fetch('/api/dxfeed/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId }),
            })

            const payload = (await response.json()) as DxFeedSyncApiPayload

            if (
              payload?.message === DxFeedErrorCode.DUPLICATE_TRADES ||
              payload?.message === 'DUPLICATE_TRADES'
            ) {
              await loadAccounts()
              await refreshTradesOnly({ force: false })
              return {
                title: t('dxfeedSync.multiAccount.alreadyImportedTrades'),
              }
            }

            if (!response.ok || !payload?.success) {
              const err = new Error(payload?.message || DxFeedErrorCode.SYNC_FAILED) as Error & {
                errorParams?: Record<string, string | number>
              }
              err.errorParams = payload?.errorParams
              throw err
            }

            await loadAccounts()
            await refreshTradesOnly({ force: false })

            return buildSyncSuccessToast(t, syncLabel, payload)
          },
          {
            loading: t('dxfeedSync.sync.inProgress', { accountId: syncLabel }),
            success: (result) => result,
            error: (e) => {
              const code =
                e instanceof Error ? e.message : DxFeedErrorCode.SYNC_FAILED
              const params =
                e instanceof Error && 'errorParams' in e
                  ? (e as Error & { errorParams?: Record<string, string | number> }).errorParams
                  : undefined
              if (
                code === DxFeedErrorCode.TOKEN_EXPIRED ||
                code === DxFeedErrorCode.MISSING_PROP_FIRM_RECONNECT ||
                code === DxFeedErrorCode.NO_TOKEN_RECONNECT ||
                code === DxFeedErrorCode.INVALID_STORED_CREDENTIALS
              ) {
                void loadAccounts()
              }
              return getDxFeedErrorToastContent(t, code, params)
            },
            copyLabel: t('common.copy'),
          },
        )

        return { success: true, message: message.title }
      } catch (error) {
        const code =
          error instanceof Error ? error.message : DxFeedErrorCode.SYNC_FAILED
        const params =
          error instanceof Error && 'errorParams' in error
            ? (error as Error & { errorParams?: Record<string, string | number> }).errorParams
            : undefined
        console.error('Sync error:', error)
        return { success: false, message: formatDxFeedError(t, code, params) }
      }
    },
    [accounts, t, refreshTradesOnly, loadAccounts],
  )

  const performSyncForAllAccounts = useCallback(async () => {
    if (isAutoSyncingRef.current) return

    isAutoSyncingRef.current = true
    setIsAutoSyncing(true)

    try {
      const validAccounts = accounts.filter(
        (acc) => acc.hasToken && !acc.tokenExpired && !acc.needsReconnect,
      )
      if (validAccounts.length === 0) {
        toast.info(t('dxfeedSync.multiAccount.noActiveAccountsToSync'))
        return
      }

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
  }, [accounts, performSyncForAccount, t])

  const checkAndPerformSyncs = useCallback(async () => {
    if (!enableAutoSync || isAutoSyncingRef.current) return

    isAutoSyncingRef.current = true
    setIsAutoSyncing(true)

    try {
      const now = Date.now()

      for (const account of accounts) {
        if (!account.hasToken || account.needsReconnect) continue

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
