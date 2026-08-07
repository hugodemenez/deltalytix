'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useData } from '@/context/data-provider'
import { useI18n } from '@/locales/client'
import { IbkrErrorCode } from '@/lib/ibkr-flex-errors'
import { formatIbkrError, getIbkrErrorToastContent } from '@/lib/ibkr-client-messages'
import { runToastWithCopy, showToastWithCopy } from '@/lib/toast-copy'
import type {
  IbkrSyncAccount,
  IbkrSyncStats,
} from '@/app/[locale]/dashboard/components/import/ibkr/sync/ibkr-types'

interface IbkrSyncApiPayload {
  success?: boolean
  message?: string
  errorParams?: Record<string, string | number>
  savedCount?: number
  tradesCount?: number
  stats?: IbkrSyncStats
}

/**
 * Chooses the message for a successful call, which may still have imported
 * nothing. "Synced 0 trades" is useless on its own — the user needs to know
 * whether that means no activity, only open positions, or rows we dropped.
 */
function buildSyncSuccessToast(
  t: unknown,
  accountId: string,
  payload: IbkrSyncApiPayload,
): { title: string; description?: string } {
  const translate = t as (key: string, params?: Record<string, string | number>) => string
  const savedCount = payload.savedCount ?? 0
  const tradesCount = payload.tradesCount ?? 0
  const stats = payload.stats

  const warnings: string[] = []
  if (stats && stats.currencies.length > 1) {
    warnings.push(
      translate('ibkrSync.sync.multiCurrencyWarning', {
        currencies: stats.currencies.join(', '),
      }),
    )
  }
  if (stats && stats.skippedUnparseableDate > 0) {
    warnings.push(
      translate('ibkrSync.sync.skippedDatesWarning', {
        count: stats.skippedUnparseableDate,
      }),
    )
  }
  const description = warnings.length > 0 ? warnings.join(' ') : undefined

  if (savedCount > 0) {
    return {
      title: translate('ibkrSync.sync.completeForAccount', {
        savedCount,
        tradesCount,
        accountId,
      }),
      description,
    }
  }

  return {
    title: translate('ibkrSync.sync.noNewTradesForAccount', { tradesCount, accountId }),
    description,
  }
}

/** Wire shape of `GET /api/ibkr/synchronizations`: dates arrive as ISO strings. */
interface IbkrConnectionPayload {
  id: string
  userId: string
  service: string
  accountId: string
  hasToken?: boolean
  tokenExpired?: boolean
  accountNumbers?: string[]
  currencies?: string[]
  lastSyncedAt?: string | null
  dailySyncTime?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

interface IbkrSyncContextType {
  performSyncForAccount: (
    accountId: string,
  ) => Promise<{ success: boolean; message: string } | undefined>
  performSyncForAllAccounts: () => Promise<void>
  isAutoSyncing: boolean
  accounts: IbkrSyncAccount[]
  loadAccounts: () => Promise<void>
  deleteAccount: (accountId: string) => Promise<void>
}

const IbkrSyncContext = createContext<IbkrSyncContextType | undefined>(undefined)

export function IbkrSyncContextProvider({ children }: { children: ReactNode }) {
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const isAutoSyncingRef = useRef(false)
  const [accounts, setAccounts] = useState<IbkrSyncAccount[]>([])

  const t = useI18n()
  const { refreshTradesOnly } = useData()

  /** The API sends dates as ISO strings; rebuild them as Date objects. */
  const normalizeSynchronization = useCallback(
    (sync: IbkrConnectionPayload): IbkrSyncAccount => ({
      id: sync.id,
      userId: sync.userId,
      service: sync.service,
      accountId: sync.accountId,
      hasToken: !!sync.hasToken,
      tokenExpired: !!sync.tokenExpired,
      accountNumbers: Array.isArray(sync.accountNumbers) ? sync.accountNumbers : [],
      currencies: Array.isArray(sync.currencies) ? sync.currencies : [],
      lastSyncedAt: sync.lastSyncedAt ? new Date(sync.lastSyncedAt) : new Date(),
      dailySyncTime: sync.dailySyncTime ? new Date(sync.dailySyncTime) : null,
      createdAt: sync.createdAt ? new Date(sync.createdAt) : new Date(),
      updatedAt: sync.updatedAt ? new Date(sync.updatedAt) : new Date(),
    }),
    [],
  )

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/ibkr/synchronizations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to fetch IBKR synchronizations')

      const result = await response.json()
      const data = Array.isArray(result.data) ? result.data : []
      setAccounts(data.map(normalizeSynchronization))
    } catch (error) {
      console.warn('Failed to load IBKR connections:', error)
      showToastWithCopy(
        'error',
        formatIbkrError(t, IbkrErrorCode.LOAD_SYNCHRONIZATIONS_FAILED),
        { copyLabel: t('common.copy') },
      )
    }
  }, [normalizeSynchronization, t])

  const deleteAccount = useCallback(async (accountId: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.accountId !== accountId))
    await fetch('/api/ibkr/synchronizations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
  }, [])

  const performSyncForAccount = useCallback(
    async (accountId: string) => {
      const account = accounts.find((acc) => acc.accountId === accountId)
      if (!account) {
        return { success: false, message: formatIbkrError(t, IbkrErrorCode.ACCOUNT_ID_REQUIRED) }
      }
      if (!account.hasToken || account.tokenExpired) {
        return {
          success: false,
          message: formatIbkrError(t, IbkrErrorCode.NO_CREDENTIALS_RECONNECT),
        }
      }

      try {
        const message = await runToastWithCopy(
          async () => {
            const response = await fetch('/api/ibkr/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId }),
            })

            const payload = (await response.json()) as IbkrSyncApiPayload

            if (!response.ok || !payload?.success) {
              const err = new Error(payload?.message || IbkrErrorCode.SYNC_FAILED) as Error & {
                errorParams?: Record<string, string | number>
              }
              err.errorParams = payload?.errorParams
              throw err
            }

            await loadAccounts()
            await refreshTradesOnly({ force: false })

            return buildSyncSuccessToast(t, accountId, payload)
          },
          {
            loading: t('ibkrSync.sync.inProgress', { accountId }),
            success: (result) => result,
            error: (e) => {
              const code = e instanceof Error ? e.message : IbkrErrorCode.SYNC_FAILED
              const params =
                e instanceof Error && 'errorParams' in e
                  ? (e as Error & { errorParams?: Record<string, string | number> }).errorParams
                  : undefined
              if (
                code === IbkrErrorCode.FLEX_TOKEN_EXPIRED ||
                code === IbkrErrorCode.FLEX_TOKEN_INVALID
              ) {
                void loadAccounts()
              }
              return getIbkrErrorToastContent(t, code, params)
            },
            copyLabel: t('common.copy'),
          },
        )

        return { success: true, message: message.title }
      } catch (error) {
        const code = error instanceof Error ? error.message : IbkrErrorCode.SYNC_FAILED
        console.error('IBKR sync error:', error)
        return { success: false, message: formatIbkrError(t, code) }
      }
    },
    [accounts, t, refreshTradesOnly, loadAccounts],
  )

  const performSyncForAllAccounts = useCallback(async () => {
    if (isAutoSyncingRef.current) return

    isAutoSyncingRef.current = true
    setIsAutoSyncing(true)

    try {
      const validAccounts = accounts.filter((acc) => acc.hasToken && !acc.tokenExpired)

      for (const account of validAccounts) {
        await performSyncForAccount(account.accountId)
        // Flex allows 10 requests per minute per token; each sync already makes
        // several, so pace the loop rather than trip error 1018.
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error('Error during bulk IBKR sync:', error)
    } finally {
      isAutoSyncingRef.current = false
      setIsAutoSyncing(false)
    }
  }, [accounts, performSyncForAccount])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  return (
    <IbkrSyncContext.Provider
      value={{
        performSyncForAccount,
        performSyncForAllAccounts,
        isAutoSyncing,
        accounts,
        loadAccounts,
        deleteAccount,
      }}
    >
      {children}
    </IbkrSyncContext.Provider>
  )
}

export function useIbkrSyncContext() {
  const context = useContext(IbkrSyncContext)
  if (context === undefined) {
    throw new Error('useIbkrSyncContext must be used within an IbkrSyncContextProvider')
  }
  return context
}
