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
import { RefreshCw, Loader2, Trash2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import {
  deleteConnectionAction,
  getConnectionsPageData,
  updateConnectionDailySyncTimeAction,
  type ConnectionStatus,
  type ConnectionsPageConnection,
  type ConnectionsPageData,
  type ConnectionService,
} from '../actions'
import { handleTradovateCallback } from '@/app/[locale]/dashboard/components/import/tradovate/sync/actions'
import { useTradovateSyncStore } from '@/store/tradovate-sync-store'
import { useTradovateSyncContext } from '@/context/tradovate-sync-context'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { useRithmicSyncContext } from '@/context/rithmic-sync-context'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { ServiceMonochromeLogo } from '@/components/monochrome-logo'
import { useConnectionsRefresh } from './connections-refresh'

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
  { service: 'thor', labelKey: 'connections.sections.thor' },
]

const iconButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white'

const secondaryButtonClassName =
  'inline-flex h-9 items-center justify-center rounded-sm border border-black/20 bg-transparent px-3 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5'

const primaryButtonClassName =
  'inline-flex h-9 items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-4 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

function formatRelative(date: Date | string | null | undefined, fallback: string) {
  if (!date) return fallback
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleString()
}

function supportsDailySync(service: string) {
  return service === 'tradovate' || service === 'dxfeed'
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

function toLocalTimeInputValue(
  dailySyncTime: Date | string | null | undefined
): string {
  if (!dailySyncTime) return ''
  const d =
    typeof dailySyncTime === 'string' ? new Date(dailySyncTime) : dailySyncTime
  if (Number.isNaN(d.getTime())) return ''
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function ConnectionStatusLight({
  status,
  syncFailed,
}: {
  status: ConnectionStatus
  syncFailed: boolean
}) {
  const t = useI18n()
  const effective: ConnectionStatus = syncFailed ? 'error' : status
  const label = syncFailed
    ? t('connections.status.syncFailed')
    : effective === 'connected'
      ? t('connections.status.connected')
      : effective === 'warning'
        ? t('connections.status.warning')
        : t('connections.status.error')

  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={label}
      aria-label={label}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          effective === 'connected' && 'bg-emerald-500',
          effective === 'warning' && 'bg-amber-500',
          effective === 'error' && 'bg-red-500'
        )}
      />
    </span>
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
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [syncFailed, setSyncFailed] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [dailySyncTime, setDailySyncTime] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  // Countdown must not SSR with Date.now() — minute boundaries cause hydration mismatches.
  const [nowMs, setNowMs] = useState<number | null>(null)
  const { performSyncForAccount: syncTradovate } = useTradovateSyncContext()
  const { performSyncForAccount: syncDxFeed } = useDxFeedSyncContext()
  const { performSyncForAccount: syncRithmicProtocol } =
    useRithmicProtocolSyncContext()

  const canSchedule = supportsDailySync(connection.service)
  const nextSyncAt = useMemo(
    () => getNextDailySyncAt(connection.dailySyncTime),
    [connection.dailySyncTime]
  )

  useEffect(() => {
    if (!canSchedule || !nextSyncAt) return
    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [canSchedule, nextSyncAt])

  const openScheduleDialog = useCallback(() => {
    setDailySyncTime(toLocalTimeInputValue(connection.dailySyncTime))
    setScheduleOpen(true)
  }, [connection.dailySyncTime])

  const handlePresetTime = useCallback((preset: string) => {
    let hours = 0
    let minutes = 0
    switch (preset) {
      case 'morning':
        hours = 8
        break
      case 'midday':
        hours = 12
        break
      case 'after-close': {
        const utcClose = new Date()
        utcClose.setUTCHours(22, 0, 0, 0)
        hours = utcClose.getHours()
        minutes = utcClose.getMinutes()
        break
      }
      case 'midnight':
        hours = 0
        break
      default:
        return
    }
    setDailySyncTime(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    )
  }, [])

  const handleSaveSchedule = useCallback(
    async (clear = false) => {
      setSavingSchedule(true)
      try {
        let utcTimeString: string | null = null
        if (!clear && dailySyncTime) {
          const [hours, minutes] = dailySyncTime.split(':').map(Number)
          const localDate = new Date()
          localDate.setHours(hours, minutes, 0, 0)
          utcTimeString = localDate.toISOString()
        }
        const result = await updateConnectionDailySyncTimeAction(
          connection.id,
          clear ? null : utcTimeString
        )
        if ('error' in result) {
          toast.error(t('connections.dailySync.updateFailed'))
          return
        }
        toast.success(t('connections.dailySync.updated'))
        setScheduleOpen(false)
        onChanged()
      } catch (error) {
        console.error(error)
        toast.error(t('connections.dailySync.updateFailed'))
      } finally {
        setSavingSchedule(false)
      }
    },
    [connection.id, dailySyncTime, onChanged, t]
  )

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      let result: { success?: boolean } | void
      if (connection.service === 'tradovate') {
        result = await syncTradovate(connection.accountId)
      } else if (connection.service === 'dxfeed') {
        result = await syncDxFeed(connection.accountId)
      } else if (connection.service === 'rithmic-protocol') {
        result = await syncRithmicProtocol(connection.accountId)
      } else {
        toast.message(t('connections.sync.manualOnly'))
        return
      }
      if (result && result.success === false) {
        setSyncFailed(true)
        toast.error(t('connections.sync.failed'))
        return
      }
      setSyncFailed(false)
      onChanged()
    } catch (error) {
      console.error(error)
      setSyncFailed(true)
      toast.error(t('connections.sync.failed'))
    } finally {
      setSyncing(false)
    }
  }, [connection, onChanged, syncDxFeed, syncRithmicProtocol, syncTradovate, t])

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

  return (
    <div className="t-acc" data-open={open ? 'true' : 'false'}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        className="t-acc-head flex w-full cursor-pointer items-center justify-between gap-4 py-6 text-left md:py-8"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-3">
            <ConnectionStatusLight
              status={connection.status}
              syncFailed={syncFailed}
            />
            <div className="min-w-0 truncate text-xl font-normal tracking-tight md:text-2xl">
              {connection.displayName}
            </div>
          </div>
          <p className="mt-1 pl-5 text-sm text-black/55 dark:text-white/55">
            {connection.loginLabel ? (
              <span className="truncate">{connection.loginLabel}</span>
            ) : null}
            {connection.authError ? (
              <>
                {connection.loginLabel ? ' · ' : null}
                <span className="text-red-600 dark:text-red-400">
                  {connection.authError}
                </span>
              </>
            ) : (
              <>
                {connection.loginLabel ? ' · ' : null}
                {t('connections.lastSynced', {
                  time: formatRelative(
                    connection.lastSyncedAt,
                    t('connections.neverSynced')
                  ),
                })}
                {canSchedule && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="underline decoration-black/20 underline-offset-2 transition-colors duration-150 hover:text-black dark:decoration-white/20 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        openScheduleDialog()
                      }}
                    >
                      {nextSyncAt && nowMs != null
                        ? t('connections.nextSyncIn', {
                            time: formatCountdown(nextSyncAt, nowMs),
                          })
                        : t('connections.nextSyncSchedule')}
                    </button>
                  </>
                )}
                {' · '}
                {connection.accounts.length === 1
                  ? t('connections.accountCount.one', { count: 1 })
                  : t('connections.accountCount.other', {
                      count: connection.accounts.length,
                    })}
              </>
            )}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {(connection.service === 'tradovate' ||
            connection.service === 'dxfeed' ||
            connection.service === 'rithmic-protocol') && (
            <button
              type="button"
              className={iconButtonClassName}
              aria-label={t('connections.sync.now')}
              disabled={syncing}
              onClick={() => void handleSync()}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          )}
          <button
            type="button"
            className={iconButtonClassName}
            aria-label={t('connections.delete')}
            disabled={deleting}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span
            className={cn(iconButtonClassName, 't-acc-chevron pointer-events-none')}
            aria-hidden
          >
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 6.5L8 10.5L12 6.5" />
            </svg>
          </span>
        </div>
      </div>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner pb-6 md:pb-8">
          {connection.accounts.length === 0 ? (
            <p className="text-sm text-black/45 dark:text-white/45">
              {t('connections.noHostedAccounts')}
            </p>
          ) : (
            <ul className="divide-y divide-black/10 dark:divide-white/10">
              {connection.accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="font-medium tracking-tight">{account.number}</span>
                  <span className="text-black/45 dark:text-white/45">
                    {account.tradeCount === 1
                      ? t('connections.tradeCount.one', { count: 1 })
                      : t('connections.tradeCount.other', {
                          count: account.tradeCount,
                        })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="rounded-sm border-black/10 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="font-normal tracking-tight">
              {t('connections.dailySync.title')}
            </DialogTitle>
            <DialogDescription className="text-black/55 dark:text-white/55">
              {t('connections.dailySync.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor={`daily-sync-${connection.id}`}
                className="text-sm text-black/55 dark:text-white/55"
              >
                {t('connections.dailySync.label')}
              </Label>
              <Input
                id={`daily-sync-${connection.id}`}
                type="time"
                value={dailySyncTime}
                onChange={(e) => setDailySyncTime(e.target.value)}
                className="h-11 rounded-sm border-black/10 bg-transparent shadow-none focus-visible:border-black/30 focus-visible:ring-0 dark:border-white/10"
              />
              <p className="text-sm text-black/45 dark:text-white/45">
                {t('connections.dailySync.timezoneNote', {
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['morning', 'connections.dailySync.presets.morning'],
                  ['midday', 'connections.dailySync.presets.midday'],
                  ['after-close', 'connections.dailySync.presets.afterClose'],
                  ['midnight', 'connections.dailySync.presets.midnight'],
                ] as const
              ).map(([preset, labelKey]) => (
                <button
                  key={preset}
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() => handlePresetTime(preset)}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <button
              type="button"
              className={cn(secondaryButtonClassName, 'text-black/55 dark:text-white/55')}
              disabled={savingSchedule || !connection.dailySyncTime}
              onClick={() => void handleSaveSchedule(true)}
            >
              {t('connections.dailySync.clear')}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButtonClassName}
                disabled={savingSchedule}
                onClick={() => setScheduleOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={primaryButtonClassName}
                disabled={savingSchedule || !dailySyncTime}
                onClick={() => void handleSaveSchedule(false)}
              >
                {savingSchedule ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('common.save')}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function readConnectionsPageCache(): ConnectionsPageData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CONNECTIONS_PAGE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConnectionsPageData
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
    <div
      className="flex w-full items-center justify-between gap-4 py-6 md:py-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex shrink-0 items-center" aria-hidden>
            <span className="h-2 w-2 motion-safe:animate-pulse rounded-full bg-amber-500" />
          </span>
          <div className="min-w-0 truncate text-xl font-normal tracking-tight md:text-2xl">
            {title || t('connections.oauth.tradovate.connecting')}
          </div>
        </div>
        <p className="mt-1 pl-5 text-sm text-black/55 dark:text-white/55">
          {t('connections.oauth.tradovate.connectingHint')}
        </p>
        <div className="mt-3 space-y-2 pl-5">
          <Skeleton className="h-3 w-48 rounded-sm bg-black/10 dark:bg-white/10" />
          <Skeleton className="h-3 w-32 rounded-sm bg-black/10 dark:bg-white/10" />
        </div>
      </div>
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-black/35 dark:text-white/35" />
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
  const t = useI18n()
  const [syncingAll, setSyncingAll] = useState(false)
  const { performSyncForAccount: syncTradovate } = useTradovateSyncContext()
  const { performSyncForAccount: syncDxFeed } = useDxFeedSyncContext()
  const { performSyncForCredential: syncRithmic } = useRithmicSyncContext()
  const { performSyncForAccount: syncRithmicProtocol } =
    useRithmicProtocolSyncContext()
  const replacingId =
    oauthPending?.externalId || oauthPending?.resolvedExternalId || null
  const hasInPlacePending =
    !!replacingId &&
    connections.some(
      (c) => c.externalId === replacingId || c.accountId === replacingId
    )
  // New connection: reserve a slot at the end (matches createdAt sort) to avoid CLS.
  const showTrailingPending = !!oauthPending && !hasInPlacePending

  const canSyncAll =
    service === 'tradovate' ||
    service === 'dxfeed' ||
    service === 'rithmic' ||
    service === 'rithmic-protocol'

  const handleSyncAll = useCallback(async () => {
    if (!canSyncAll || connections.length === 0) {
      toast.message(t('connections.sync.manualOnly'))
      return
    }

    setSyncingAll(true)
    let failed = 0
    try {
      for (const connection of connections) {
        try {
          let result: { success?: boolean } | void
          if (service === 'tradovate') {
            result = await syncTradovate(connection.accountId)
          } else if (service === 'dxfeed') {
            result = await syncDxFeed(connection.accountId)
          } else if (service === 'rithmic-protocol') {
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
      onChanged()
    } finally {
      setSyncingAll(false)
    }
  }, [
    canSyncAll,
    connections,
    onChanged,
    service,
    syncDxFeed,
    syncRithmic,
    syncRithmicProtocol,
    syncTradovate,
    t,
  ])

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-4">
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
        {canSyncAll ? (
          <button
            type="button"
            onClick={() => void handleSyncAll()}
            disabled={syncingAll || connections.length === 0}
            aria-label={`${t('rithmic.actions.syncAll')}: ${label}`}
            className={cn(secondaryButtonClassName, 'gap-1.5 px-3')}
          >
            {syncingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            )}
            {t('rithmic.actions.syncAll')}
          </button>
        ) : null}
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
  const searchParams = useSearchParams()
  const tradovateStore = useTradovateSyncStore()
  const { register } = useConnectionsRefresh()
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
  const { loadAccounts: loadTradovate } = useTradovateSyncContext()
  const { loadAccounts: loadDxFeed } = useDxFeedSyncContext()
  const storeHydrated = useTradovateSyncStore.persist?.hasHydrated?.() ?? true
  const [tradovateStoreReady, setTradovateStoreReady] = useState(storeHydrated)

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    try {
      const next = await getConnectionsPageData()
      setData(next)
      writeConnectionsPageCache(next)
      await Promise.allSettled([loadTradovate(), loadDxFeed()])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(error)
      // Next can abort in-flight server actions during oauth router.replace.
      if (/unexpected response/i.test(message)) {
        try {
          const next = await getConnectionsPageData()
          setData(next)
          writeConnectionsPageCache(next)
          await Promise.allSettled([loadTradovate(), loadDxFeed()])
          return
        } catch (retryError) {
          console.error(retryError)
        }
      }
      if (!opts?.quiet) {
        toast.error(t('connections.loadFailed'))
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
        const next = await getConnectionsPageData()
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

  return (
    <div className="space-y-14 md:space-y-16">
      {activeSections.map((section) => (
        <TypeSection
          key={section.service}
          service={section.service}
          label={t(section.labelKey as 'connections.sections.rithmic')}
          connections={byService.get(section.service) ?? []}
          onChanged={() => void load()}
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
          <ul className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
            {data!.standaloneAccounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between gap-4 py-6 md:py-8"
              >
                <div className="text-xl font-normal tracking-tight md:text-2xl">
                  {account.number}
                </div>
                <span className="text-sm text-black/45 dark:text-white/45">
                  {account.tradeCount === 1
                    ? t('connections.tradeCount.one', { count: 1 })
                    : t('connections.tradeCount.other', {
                        count: account.tradeCount,
                      })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
