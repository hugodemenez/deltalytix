'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, Loader2, Trash2 } from 'lucide-react'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  nextIntervalOccurrence,
  syncScheduleMode,
} from '@/lib/connection-sync-schedule'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import {
  deleteConnectionAction,
  type ConnectionStatus,
  type ConnectionsPageConnection,
  type ConnectionsPageData,
  type ConnectionService,
} from '../actions'
import { supportsDailySync } from '../daily-sync-services'
import { SyncSchedulePicker } from './sync-schedule-picker'
import {
  handleTradovateCallback,
  initiateTradovateOAuth,
  type TradovateEnvironment,
} from '@/app/[locale]/dashboard/components/import/tradovate/sync/actions'
import { useTradovateSyncStore } from '@/store/tradovate-sync-store'
import { useTradovateSyncContext } from '@/context/tradovate-sync-context'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { useIbkrSyncContext } from '@/context/ibkr-sync-context'
import { useRithmicSyncContext } from '@/context/rithmic-sync-context'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { ServiceMonochromeLogo } from '@/components/monochrome-logo'
import { useConnectionsRefresh } from './connections-refresh'

// One shape for every status, so a row does not reflow when a connection breaks.
const statusActionClassName =
  'inline-flex h-8 items-center justify-center gap-2 rounded-sm border border-black/20 bg-transparent px-3 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5'

// Same footprint, no affordance — nothing to do but report the state.
const statusBadgeClassName =
  'inline-flex h-8 items-center gap-2 px-1 text-sm text-black/55 dark:text-white/55'

const SERVICE_SECTIONS: {
  service: ConnectionService
  labelKey: string
}[] = [
  { service: 'rithmic', labelKey: 'connections.sections.rithmic' },
  {
    service: 'rithmic-protocol',
    labelKey: 'connections.sections.rithmicProtocol',
  },
  { service: 'tradovate', labelKey: 'connections.sections.tradovate' },
  { service: 'dxfeed', labelKey: 'connections.sections.dxfeed' },
  { service: 'ibkr', labelKey: 'connections.sections.ibkr' },
  { service: 'thor', labelKey: 'connections.sections.thor' },
]

// Accounts shown inline under a connection before the "show more" toggle.
const VISIBLE_ACCOUNTS = 1

// Providers whose hosted connections can be synced on demand from this page.
const SYNCABLE_SERVICES = new Set<string>([
  'rithmic',
  'rithmic-protocol',
  'tradovate',
  'dxfeed',
  'ibkr',
])

const iconButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white'

function formatRelative(date: Date | string | null | undefined, fallback: string) {
  if (!date) return fallback
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleString()
}

// Fixed-width, locale-ordered date (zero-padded day/month, 4-digit year) so
// every "Last trade" label has the same length and rows stay visually aligned.
function formatTradeDate(date: string | null | undefined, locale: string) {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Account rows:
 * - Mobile: account number, then one meta row — last trade (left) · trades (right).
 * - sm+: shared subgrid — account | trade count | last trade (same row).
 * Trade counts stay right-aligned with tabular-nums for quick comparison.
 *
 * `continuation` keeps the leading separator: the revealed accounts render as a
 * second list (its own animated panel) but must read as one continuous table.
 */
function AccountTradeList({
  accounts,
  locale,
  density = 'compact',
  continuation = false,
}: {
  accounts: Array<{
    id: string
    number: string
    tradeCount: number
    lastTradeDate: string | null
  }>
  locale: string
  density?: 'compact' | 'standalone'
  continuation?: boolean
}) {
  const t = useI18n()
  const compact = density === 'compact'
  const metaClassName = cn(
    'whitespace-nowrap text-black/45 dark:text-white/45 tabular-nums',
    !compact && 'text-sm'
  )

  return (
    <ul
      className={cn(
        'grid grid-cols-1',
        'sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4',
        !compact &&
          'border-y border-black/10 dark:border-white/10'
      )}
    >
      {accounts.map((account) => {
        const lastTrade = formatTradeDate(account.lastTradeDate, locale)
        const tradeCountLabel =
          account.tradeCount === 1
            ? t('connections.tradeCount.one', { count: 1 })
            : t('connections.tradeCount.other', {
                count: account.tradeCount,
              })

        return (
          <li
            key={account.id}
            className={cn(
              'grid grid-cols-1 gap-y-1 border-t border-black/10 dark:border-white/10',
              !continuation && 'first:border-t-0',
              'sm:col-span-full sm:grid-cols-subgrid sm:items-baseline',
              compact ? 'py-3 text-sm' : 'py-6 md:py-8'
            )}
          >
            <span
              className={cn(
                'min-w-0 break-all tracking-tight sm:truncate sm:break-normal',
                compact
                  ? 'font-medium'
                  : 'text-xl font-normal md:text-2xl'
              )}
            >
              {account.number}
            </span>
            <div className="flex min-w-0 items-baseline justify-between gap-3 sm:contents">
              <span
                className={cn(
                  metaClassName,
                  'order-2 text-right sm:order-1 sm:justify-self-end'
                )}
              >
                {tradeCountLabel}
              </span>
              <span
                className={cn(
                  metaClassName,
                  'order-1 sm:order-2 sm:justify-self-end'
                )}
              >
                {lastTrade
                  ? t('connections.lastTrade', { date: lastTrade })
                  : null}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function getNextDailySyncAt(
  dailySyncTime: Date | string | null | undefined
): Date | null {
  if (!dailySyncTime) return null
  const source =
    typeof dailySyncTime === 'string' ? new Date(dailySyncTime) : dailySyncTime
  if (Number.isNaN(source.getTime())) return null

  const now = new Date()
  const next = new Date()
  next.setHours(source.getHours(), source.getMinutes(), 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

function formatCountdown(next: Date, nowMs: number): string {
  const ms = Math.max(0, next.getTime() - nowMs)
  const totalMinutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}



/**
 * Status and its remedy in a single control: the dot reports the state, the
 * label offers the one action that state allows — sync while healthy, reconnect
 * once broken. A connection with nothing to trigger degrades to a plain badge.
 */
function ConnectionStatusAction({
  status,
  syncFailed,
  canSync,
  syncing,
  reconnecting,
  onSync,
  onReconnect,
}: {
  status: ConnectionStatus
  syncFailed: boolean
  canSync: boolean
  syncing: boolean
  reconnecting: boolean
  onSync: () => void
  onReconnect: () => void
}) {
  const t = useI18n()
  const isError = syncFailed || status !== 'connected'
  const statusLabel = syncFailed
    ? t('connections.status.syncFailed')
    : isError
      ? t('connections.status.error')
      : t('connections.status.connected')

  const dot = (
    <span
      className={cn(
        'h-2 w-2 shrink-0 rounded-full',
        isError ? 'bg-red-500' : 'bg-emerald-500'
      )}
      aria-hidden
    />
  )

  if (isError) {
    return (
      <button
        type="button"
        className={statusActionClassName}
        title={statusLabel}
        disabled={reconnecting}
        onClick={onReconnect}
      >
        {reconnecting ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : (
          dot
        )}
        {/* The dot is the only visual carrier of status — name it for AT. */}
        <span className="sr-only">{statusLabel}, </span>
        {t('connections.reconnect')}
      </button>
    )
  }

  if (!canSync) {
    return (
      <span className={statusBadgeClassName} title={statusLabel}>
        {dot}
        {statusLabel}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={statusActionClassName}
      title={statusLabel}
      disabled={syncing}
      onClick={onSync}
    >
      {syncing ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        dot
      )}
      <span className="sr-only">{statusLabel}, </span>
      {t('connections.sync.now')}
    </button>
  )
}

function ConnectionRow({
  connection,
  onChanged,
}: {
  connection: ConnectionsPageConnection
  onChanged: () => void
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [syncFailed, setSyncFailed] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  // Countdown must not SSR with Date.now() — minute boundaries cause hydration mismatches.
  const [nowMs, setNowMs] = useState<number | null>(null)
  const { openConnect } = useConnectionsRefresh()
  const tradovateStore = useTradovateSyncStore()
  const { performSyncForAccount: syncTradovate } = useTradovateSyncContext()
  const { performSyncForAccount: syncDxFeed } = useDxFeedSyncContext()
  const { performSyncForAccount: syncIbkr } = useIbkrSyncContext()
  const {
    performSyncForAccount: syncRithmicProtocol,
    isAccountSyncing: isRithmicProtocolSyncing,
  } = useRithmicProtocolSyncContext()
  const protocolSyncing =
    connection.service === 'rithmic-protocol' &&
    isRithmicProtocolSyncing(connection.accountId)
  const rowSyncing = protocolSyncing || syncing
  // Red = expired/missing auth, or the last sync attempt failed.
  const needsReconnect = syncFailed || connection.status !== 'connected'
  // Rithmic and Thor sync from their own flows, not from this row.
  const canSyncRow =
    connection.service === 'tradovate' ||
    connection.service === 'dxfeed' ||
    connection.service === 'ibkr' ||
    connection.service === 'rithmic-protocol'

  const canSchedule = supportsDailySync(connection.service)
  const scheduleMode = syncScheduleMode({
    syncIntervalMinutes: connection.syncIntervalMinutes,
    dailySyncTime: connection.dailySyncTime,
  })
  // A recurring cadence counts down to its next occurrence, so it needs `nowMs`;
  // a daily time does not move between ticks.
  const nextSyncAt = useMemo(() => {
    if (scheduleMode === 'interval') {
      // `nowMs` lands with the first client tick — same reason the countdown
      // itself waits for it rather than reading the clock while rendering.
      if (nowMs == null || !connection.syncIntervalMinutes) return null
      return nextIntervalOccurrence(
        connection.syncIntervalMinutes,
        new Date(nowMs)
      )
    }
    if (scheduleMode === 'daily') {
      return getNextDailySyncAt(connection.dailySyncTime)
    }
    return null
  }, [
    connection.dailySyncTime,
    connection.syncIntervalMinutes,
    nowMs,
    scheduleMode,
  ])

  useEffect(() => {
    if (!canSchedule || scheduleMode === 'off') return
    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [canSchedule, scheduleMode])

  const handleSync = useCallback(async () => {
    const usesLocalSyncState = connection.service !== 'rithmic-protocol'
    if (usesLocalSyncState) setSyncing(true)
    try {
      let result: { success?: boolean } | void
      if (connection.service === 'tradovate') {
        result = await syncTradovate(connection.accountId)
      } else if (connection.service === 'dxfeed') {
        result = await syncDxFeed(connection.accountId)
      } else if (connection.service === 'ibkr') {
        result = await syncIbkr(connection.accountId)
      } else if (connection.service === 'rithmic-protocol') {
        // Loading/error feedback comes from Protocol sync context (row spinner).
        result = await syncRithmicProtocol(connection.accountId)
      } else {
        toast.message(t('connections.sync.manualOnly'))
        return
      }
      if (result && result.success === false) {
        setSyncFailed(true)
        if (usesLocalSyncState) {
          toast.error(t('connections.sync.failed'))
        }
        return
      }
      setSyncFailed(false)
      onChanged()
    } catch (error) {
      console.error(error)
      setSyncFailed(true)
      if (usesLocalSyncState) {
        toast.error(t('connections.sync.failed'))
      }
    } finally {
      if (usesLocalSyncState) setSyncing(false)
    }
  }, [connection, onChanged, syncDxFeed, syncIbkr, syncRithmicProtocol, syncTradovate, t])

  const handleReconnect = useCallback(async () => {
    // Tradovate can re-auth in place via OAuth without opening the add sheet.
    if (connection.service === 'tradovate') {
      setReconnecting(true)
      try {
        const environment: TradovateEnvironment =
          connection.environment === 'live' ? 'live' : 'demo'
        tradovateStore.setEnvironment(environment)
        const result = await initiateTradovateOAuth(
          connection.accountId,
          environment
        )
        if (result.error || !result.authUrl || !result.state) {
          toast.error(t('connections.reconnectFailed'))
          return
        }
        tradovateStore.setOAuthState(result.state)
        sessionStorage.setItem('tradovate_oauth_state', result.state)
        sessionStorage.setItem(
          'tradovate_oauth_pending',
          JSON.stringify({
            environment,
            externalId: connection.accountId,
          })
        )
        window.location.href = result.authUrl
      } catch (error) {
        console.error(error)
        toast.error(t('connections.reconnectFailed'))
      } finally {
        setReconnecting(false)
      }
      return
    }

    openConnect(connection.service as ConnectionService, {
      service: connection.service as ConnectionService,
      accountId: connection.accountId,
      displayName: connection.displayName,
      environment: connection.environment,
    })
  }, [connection, openConnect, t, tradovateStore])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const result = await deleteConnectionAction(connection.id)
      if ('error' in result) {
        toast.error(t('connections.deleteFailed'))
        return
      }
      toast.success(t('connections.deleted'))
      setDeleteOpen(false)
      onChanged()
    } catch (error) {
      console.error(error)
      toast.error(t('connections.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }, [connection.id, onChanged, t])

  // Split rather than slice: the overflow accounts stay mounted inside the
  // collapsed panel so revealing them can animate instead of popping in.
  const leadAccounts = connection.accounts.slice(0, VISIBLE_ACCOUNTS)
  const overflowAccounts = connection.accounts.slice(VISIBLE_ACCOUNTS)

  return (
    <div
      className="t-acc py-6 md:py-8"
      data-open={showAllAccounts ? 'true' : 'false'}
    >
      <div>
        {/* Title row: name, then the status action and delete on one line.
            Wrapping is a safety net for long broker names only — the status
            control keeps a fixed footprint, so rows normally stay single-line. */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {/* `flex-auto` bases the wrap decision on the name's own width: it
              shares the line while it fits, takes a full line when it does not,
              and only truncates when even a full line is too narrow. */}
          <div className="min-w-0 flex-auto truncate text-xl font-normal tracking-tight md:text-2xl">
            {connection.displayName}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ConnectionStatusAction
              status={connection.status}
              syncFailed={syncFailed}
              canSync={canSyncRow}
              syncing={rowSyncing}
              reconnecting={reconnecting}
              onSync={() => void handleSync()}
              onReconnect={() => void handleReconnect()}
            />
            <button
              type="button"
              className={iconButtonClassName}
              aria-label={t('connections.delete')}
              disabled={deleting}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          {connection.loginLabel ? (
            <>
              <span className="truncate">{connection.loginLabel}</span>
              {' · '}
            </>
          ) : null}
          {t('connections.lastSynced', {
            time: formatRelative(
              connection.lastSyncedAt,
              t('connections.neverSynced')
            ),
          })}
          {/* A countdown to the next sync is noise while the connection is
              broken — nothing will sync until it is reconnected. */}
          {canSchedule && !needsReconnect && (
            <>
              {' · '}
              <SyncSchedulePicker
                connectionId={connection.id}
                scheduleMode={scheduleMode}
                intervalMinutes={connection.syncIntervalMinutes}
                dailySyncTime={connection.dailySyncTime}
                locale={locale}
                label={
                  nextSyncAt && nowMs != null
                    ? t('connections.nextSyncIn', {
                        time: formatCountdown(nextSyncAt, nowMs),
                      })
                    : t('connections.nextSyncSchedule')
                }
                onChanged={onChanged}
              />
            </>
          )}
          {' · '}
          {connection.accounts.length === 1
            ? t('connections.accountCount.one', { count: 1 })
            : t('connections.accountCount.other', {
                count: connection.accounts.length,
              })}
        </p>
      </div>
      {/* No empty state: the meta line above already reads "0 accounts". */}
      {connection.accounts.length > 0 && (
        <div className="mt-2">
          <AccountTradeList
            accounts={leadAccounts}
            locale={locale}
            density="compact"
          />
          {overflowAccounts.length > 0 && (
            <>
              {/* Toggle sits above the panel it controls: the revealed rows push
                  the page down, not the button, so it stays under the pointer
                  through repeated clicks. */}
              <button
                type="button"
                aria-expanded={showAllAccounts}
                className="mt-1 flex w-full items-center gap-1 py-2 text-left text-sm text-black/55 transition-colors duration-150 hover:text-black dark:text-white/55 dark:hover:text-white"
                onClick={() => setShowAllAccounts((v) => !v)}
              >
                {showAllAccounts
                  ? t('connections.showFewerAccounts')
                  : overflowAccounts.length === 1
                    ? t('connections.showMoreAccounts.one', { count: 1 })
                    : t('connections.showMoreAccounts.other', {
                        count: overflowAccounts.length,
                      })}
                <ChevronDown
                  className="t-acc-chevron h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
              <div className="t-acc-panel">
                <div className="t-acc-panel-inner">
                  {/* Spacing goes inside the clipped box — padding on the box
                      itself survives the collapse and leaves a dead gap. */}
                  <div className="pt-3">
                    <AccountTradeList
                      accounts={overflowAccounts}
                      locale={locale}
                      density="compact"
                      continuation
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-sm border-black/10 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal tracking-tight">
              {t('connections.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-black/55 dark:text-white/55">
              {t('connections.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm" disabled={deleting}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-sm bg-red-600 text-white hover:bg-red-600/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('connections.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

type TradovateOAuthPending = {
  environment: 'demo' | 'live'
  /** Existing connection being reconnected — skeleton replaces that row. */
  externalId?: string
  /** After callback: hide this id from the list until pending clears (same slot). */
  resolvedExternalId?: string
}

const CONNECTIONS_PAGE_CACHE_KEY = 'connections_page_cache_v1'

function reviveDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function reviveConnectionsPageData(parsed: ConnectionsPageData): ConnectionsPageData {
  return {
    connections: (parsed.connections ?? []).map((connection) => ({
      ...connection,
      createdAt: reviveDate(connection.createdAt) ?? new Date(0),
      updatedAt: reviveDate(connection.updatedAt) ?? new Date(0),
      lastSyncedAt: reviveDate(connection.lastSyncedAt) ?? new Date(0),
      tokenExpiresAt: reviveDate(connection.tokenExpiresAt),
      dailySyncTime: reviveDate(connection.dailySyncTime),
      accounts: (connection.accounts ?? []).map((account) => ({
        ...account,
        createdAt: reviveDate(account.createdAt) ?? new Date(0),
      })),
    })),
    standaloneAccounts: (parsed.standaloneAccounts ?? []).map((account) => ({
      ...account,
      createdAt: reviveDate(account.createdAt) ?? new Date(0),
    })),
  }
}

/**
 * Client refresh via JSON API (not a server action).
 * Avoids Next.js "An unexpected response was received from the server" when
 * action POSTs receive HTML during Instant Navigations / HMR / redirects.
 */
async function fetchConnectionsPageData(): Promise<ConnectionsPageData> {
  const response = await fetch('/api/connections/page-data', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`CONNECTIONS_LOAD_FAILED:${response.status}`)
  }
  const json = (await response.json()) as ConnectionsPageData | { error?: string }
  if (!json || typeof json !== 'object' || !('connections' in json)) {
    throw new Error('CONNECTIONS_LOAD_FAILED:invalid_payload')
  }
  return reviveConnectionsPageData(json)
}

function readConnectionsPageCache(): ConnectionsPageData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CONNECTIONS_PAGE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConnectionsPageData
    return reviveConnectionsPageData(parsed)
  } catch {
    return null
  }
}

function writeConnectionsPageCache(data: ConnectionsPageData) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CONNECTIONS_PAGE_CACHE_KEY, JSON.stringify(data))
  } catch {
    // quota / private mode — ignore
  }
}

function readOAuthPendingFromSession(
  searchParams: URLSearchParams
): TradovateOAuthPending | null {
  if (typeof window === 'undefined') return null
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return null

  let pending: TradovateOAuthPending = {
    environment: state.split('.')[0] === 'live' ? 'live' : 'demo',
  }
  try {
    const raw = sessionStorage.getItem('tradovate_oauth_pending')
    if (raw === 'demo' || raw === 'live') {
      pending = { environment: raw }
    } else if (raw) {
      const parsed = JSON.parse(raw) as {
        environment?: string
        externalId?: string
      }
      pending = {
        environment: parsed.environment === 'live' ? 'live' : 'demo',
        externalId: parsed.externalId || undefined,
      }
    }
  } catch {
    // keep state-derived env
  }
  return pending
}

function PendingTradovateConnectionRow({ title }: { title?: string }) {
  const t = useI18n()
  return (
    <div className="w-full py-6 md:py-8" aria-busy="true" aria-live="polite">
      {/* Mirrors ConnectionRow: name on the left, status control on the right. */}
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0 flex-1 truncate text-xl font-normal tracking-tight md:text-2xl">
          {title || t('connections.oauth.tradovate.connecting')}
        </div>
        <span className={cn(statusBadgeClassName, 'shrink-0')}>
          <span
            className="h-2 w-2 shrink-0 motion-safe:animate-pulse rounded-full bg-amber-500"
            aria-hidden
          />
          {t('connections.oauth.tradovate.connecting')}
        </span>
      </div>
      <p className="mt-1 text-sm text-black/55 dark:text-white/55">
        {t('connections.oauth.tradovate.connectingHint')}
      </p>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-48 rounded-sm bg-black/10 dark:bg-white/10" />
        <Skeleton className="h-3 w-32 rounded-sm bg-black/10 dark:bg-white/10" />
      </div>
    </div>
  )
}

function TypeSection({
  service,
  label,
  connections,
  onChanged,
  oauthPending,
}: {
  service: ConnectionService
  label: string
  connections: ConnectionsPageConnection[]
  onChanged: () => void
  oauthPending?: TradovateOAuthPending | null
}) {
  const replacingId =
    oauthPending?.externalId || oauthPending?.resolvedExternalId || null
  const hasInPlacePending =
    !!replacingId &&
    connections.some(
      (c) => c.externalId === replacingId || c.accountId === replacingId
    )
  // New connection: reserve a slot at the end (matches createdAt sort) to avoid CLS.
  const showTrailingPending = !!oauthPending && !hasInPlacePending

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-4">
        <h2 className="flex items-center gap-3 text-xl font-normal tracking-tight md:text-2xl">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center md:h-8 md:w-8">
            <ServiceMonochromeLogo
              service={service}
              alt=""
              size={32}
              className="h-7 w-7 md:h-8 md:w-8"
            />
          </span>
          {label}
        </h2>
      </div>
      <div className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
        {connections.map((connection) => {
          const isReplacing =
            !!replacingId &&
            (connection.externalId === replacingId ||
              connection.accountId === replacingId)
          if (isReplacing && oauthPending) {
            return (
              <PendingTradovateConnectionRow
                key={`pending-${connection.id}`}
                title={connection.displayName}
              />
            )
          }
          return (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              onChanged={onChanged}
            />
          )
        })}
        {showTrailingPending && oauthPending ? (
          <PendingTradovateConnectionRow key="pending-tradovate-new" />
        ) : null}
      </div>
    </section>
  )
}

/**
 * Connections list body — streamed/cached behind Suspense.
 * Page chrome (title, actions) lives in `ConnectionsPageChrome` outside that boundary.
 */
export function ConnectionsPageClient({
  initialData,
}: {
  initialData: ConnectionsPageData
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const searchParams = useSearchParams()
  const tradovateStore = useTradovateSyncStore()
  const { register, setSyncAll } = useConnectionsRefresh()
  // Seeded from cached RSC (`CachedConnectionsPage`) — warm cache skips the
  // list Suspense skeleton; this client state is already hydrated on first paint.
  const [data, setData] = useState<ConnectionsPageData | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [oauthPending, setOauthPending] = useState<TradovateOAuthPending | null>(
    null
  )
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const oauthCallbackHandled = useRef(false)
  const oauthResultHandled = useRef(false)
  const cacheRestored = useRef(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const {
    loadAccounts: loadTradovate,
    performSyncForAccount: syncTradovate,
  } = useTradovateSyncContext()
  const {
    loadAccounts: loadDxFeed,
    performSyncForAccount: syncDxFeed,
  } = useDxFeedSyncContext()
  const { performSyncForAccount: syncIbkr } = useIbkrSyncContext()
  const { performSyncForCredential: syncRithmic } = useRithmicSyncContext()
  const { performSyncForAccount: syncRithmicProtocol } =
    useRithmicProtocolSyncContext()
  const storeHydrated = useTradovateSyncStore.persist?.hasHydrated?.() ?? true
  const [tradovateStoreReady, setTradovateStoreReady] = useState(storeHydrated)

  const dataRef = useRef(data)
  dataRef.current = data

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    try {
      const next = await fetchConnectionsPageData()
      setData(next)
      writeConnectionsPageCache(next)
      await Promise.allSettled([loadTradovate(), loadDxFeed()])
    } catch (error) {
      console.error(error)
      // Soft refresh / post-mutation refresh: keep RSC-seeded rows. Only surface
      // loadFailed when the page has nothing useful to show.
      if (!opts?.quiet) {
        const current = dataRef.current
        const hasRows =
          (current?.connections.length ?? 0) > 0 ||
          (current?.standaloneAccounts.length ?? 0) > 0
        if (!hasRows) {
          toast.error(t('connections.loadFailed'))
        }
      }
    } finally {
      setLoading(false)
    }
  }, [loadDxFeed, loadTradovate, t])

  // OAuth pending only (sessionStorage) — list data already came from the server.
  useLayoutEffect(() => {
    if (cacheRestored.current) return
    cacheRestored.current = true
    writeConnectionsPageCache(initialData)
    const pending = readOAuthPendingFromSession(
      new URLSearchParams(window.location.search)
    )
    if (pending) {
      setOauthPending(pending)
    }
  }, [initialData])

  useEffect(() => {
    const unsubscribe = useTradovateSyncStore.persist?.onFinishHydration?.(() => {
      setTradovateStoreReady(true)
    })
    if (useTradovateSyncStore.persist?.hasHydrated?.()) {
      setTradovateStoreReady(true)
    }
    return () => {
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    // Soft refresh in background; UI already has RSC/cached data.
    void load({ quiet: true })
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [load])

  useEffect(() => {
    return register(() => {
      void load({ quiet: true })
    })
  }, [load, register])

  // Process Tradovate OAuth callback in-place (no /import bounce).
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code || !state) return
    if (!tradovateStoreReady) return
    if (oauthCallbackHandled.current) return
    oauthCallbackHandled.current = true

    let pendingMeta: TradovateOAuthPending = {
      environment: state.split('.')[0] === 'live' ? 'live' : 'demo',
    }
    try {
      const raw =
        typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('tradovate_oauth_pending')
          : null
      if (raw) {
        if (raw === 'demo' || raw === 'live') {
          pendingMeta = { environment: raw }
        } else {
          const parsed = JSON.parse(raw) as {
            environment?: string
            externalId?: string
          }
          pendingMeta = {
            environment: parsed.environment === 'live' ? 'live' : 'demo',
            externalId: parsed.externalId || undefined,
          }
        }
      }
    } catch {
      // ignore malformed pending payload
    }

    // May already be set from first paint; keep / refresh meta.
    setOauthPending(pendingMeta)
    setLoading(false)

    const finishUrlCleanup = () => {
      // Prefer history API so we do not abort in-flight server actions.
      // Keep locale prefix (/en/... or /fr/...).
      window.history.replaceState(null, '', window.location.pathname)
    }

    const run = async () => {
      try {
        const storedOAuthState =
          tradovateStore.oauthState ??
          (typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('tradovate_oauth_state')
            : null)

        if (!storedOAuthState) {
          toast.error('OAuth state not found - please try again')
          return
        }
        if (state !== storedOAuthState) {
          toast.error('Invalid state parameter - possible security issue')
          return
        }

        const result = await handleTradovateCallback(code, state)
        tradovateStore.clearOAuthState()
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('tradovate_oauth_state')
          sessionStorage.removeItem('tradovate_oauth_pending')
        }

        if (result.error) {
          toast.error(result.error)
          return
        }

        const resolvedExternalId = result.accountId || pendingMeta.externalId
        // Keep the same slot reserved while we hydrate the list.
        if (resolvedExternalId) {
          setOauthPending({
            ...pendingMeta,
            externalId: pendingMeta.externalId,
            resolvedExternalId,
          })
        }

        toast.success(t('connections.oauth.tradovate.success'))
        captureConnectionCreated('tradovate')
        const next = await fetchConnectionsPageData()
        // Single paint: drop skeleton and show the real row in the same slot.
        setData(next)
        writeConnectionsPageCache(next)
        setOauthPending(null)
        await Promise.allSettled([loadTradovate(), loadDxFeed()])
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error
            ? error.message
            : t('connections.oauth.tradovate.unknownError')
        )
      } finally {
        setOauthPending(null)
        finishUrlCleanup()
      }
    }

    void run()
  }, [
    loadDxFeed,
    loadTradovate,
    searchParams,
    t,
    tradovateStore,
    tradovateStoreReady,
  ])

  // Legacy bridge: /import used to redirect with oauth=tradovate&result=...
  useEffect(() => {
    if (oauthResultHandled.current) return
    if (searchParams.get('oauth') !== 'tradovate') return
    if (searchParams.get('code')) return
    oauthResultHandled.current = true

    const result = searchParams.get('result')
    const reason = searchParams.get('reason')
    const registered = searchParams.get('registered') === '1'

    if (result === 'success') {
      toast.success(t('connections.oauth.tradovate.success'))
      captureConnectionCreated('tradovate', { legacy_oauth_bridge: true })
    } else if (result === 'error') {
      toast.error(
        registered
          ? t('connections.oauth.tradovate.errorRegistered', {
              reason: reason || t('connections.oauth.tradovate.unknownError'),
            })
          : reason || t('connections.oauth.tradovate.unknownError')
      )
    }

    window.history.replaceState(null, '', window.location.pathname)
  }, [searchParams, t])

  const byService = useMemo(() => {
    const map = new Map<string, ConnectionsPageConnection[]>()
    for (const section of SERVICE_SECTIONS) {
      map.set(section.service, [])
    }
    for (const connection of data?.connections ?? []) {
      const list = map.get(connection.service) ?? []
      list.push(connection)
      map.set(connection.service, list)
    }
    return map
  }, [data])

  const activeSections = useMemo(
    () =>
      SERVICE_SECTIONS.filter((section) => {
        if (section.service === 'tradovate' && oauthPending) return true
        return (byService.get(section.service)?.length ?? 0) > 0
      }),
    [byService, oauthPending]
  )

  // Every hosted connection that can be synced on demand, across all providers.
  const syncableConnections = useMemo(
    () =>
      (data?.connections ?? []).filter((connection) =>
        SYNCABLE_SERVICES.has(connection.service)
      ),
    [data]
  )

  const handleSyncAll = useCallback(async () => {
    if (syncableConnections.length === 0) return

    setSyncingAll(true)
    let failed = 0
    try {
      for (const connection of syncableConnections) {
        try {
          let result: { success?: boolean } | void
          if (connection.service === 'tradovate') {
            result = await syncTradovate(connection.accountId)
          } else if (connection.service === 'dxfeed') {
            result = await syncDxFeed(connection.accountId)
          } else if (connection.service === 'ibkr') {
            result = await syncIbkr(connection.accountId)
          } else if (connection.service === 'rithmic-protocol') {
            result = await syncRithmicProtocol(connection.accountId)
          } else {
            result = await syncRithmic(connection.accountId)
          }
          if (result && result.success === false) {
            failed += 1
          }
        } catch (error) {
          console.error(error)
          failed += 1
        }
      }

      if (failed > 0) {
        toast.error(t('connections.sync.failed'))
      } else {
        toast.success(t('connections.sync.allDone'))
      }
      await load()
    } finally {
      setSyncingAll(false)
    }
  }, [
    load,
    syncDxFeed,
    syncIbkr,
    syncRithmic,
    syncRithmicProtocol,
    syncTradovate,
    syncableConnections,
    t,
  ])

  // Publish the action so the page chrome can render "Sync all" alongside the
  // other header actions (this list streams in behind its own Suspense boundary).
  useEffect(() => {
    if (syncableConnections.length === 0) {
      setSyncAll(null)
      return
    }
    setSyncAll({ syncing: syncingAll, run: () => void handleSyncAll() })
    return () => setSyncAll(null)
  }, [handleSyncAll, setSyncAll, syncableConnections.length, syncingAll])

  return (
    <div className="space-y-14 md:space-y-16">
      {activeSections.map((section) => (
        <TypeSection
          key={section.service}
          service={section.service}
          label={t(section.labelKey as 'connections.sections.rithmic')}
          connections={byService.get(section.service) ?? []}
          onChanged={() => void load({ quiet: true })}
          oauthPending={
            section.service === 'tradovate' ? oauthPending : null
          }
        />
      ))}

      {!loading && activeSections.length === 0 && !oauthPending && (
        <p className="border-y border-black/10 py-10 text-sm text-black/45 dark:border-white/10 dark:text-white/45">
          {t('connections.noConnectionsYet')}
        </p>
      )}

      {(data?.standaloneAccounts.length ?? 0) > 0 && (
        <section className="space-y-2">
          <div>
            <h2 className="text-xl font-normal tracking-tight md:text-2xl">
              {t('connections.sections.standalone')}
            </h2>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">
              {t('connections.standaloneHint')}
            </p>
          </div>
          <AccountTradeList
            accounts={data!.standaloneAccounts}
            locale={locale}
            density="standalone"
          />
        </section>
      )}
    </div>
  )
}
