'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, Loader2, X } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { platforms, type PlatformConfig } from '@/app/[locale]/dashboard/components/import/config/platforms'
import { PlatformTutorial } from '@/app/[locale]/dashboard/components/import/components/platform-tutorial'
import {
  getConnectionsPageData,
  type ConnectionsPageConnection,
  type ConnectionsPageData,
  type ConnectionService,
} from '../actions'
import { ConnectServiceModal } from './connect-service-modal'
import ImportButton from '@/app/[locale]/dashboard/components/import/import-button'
import { useTradovateSyncContext } from '@/context/tradovate-sync-context'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { toast } from 'sonner'

const SERVICE_SECTIONS: {
  service: ConnectionService
  labelKey: string
  addLabelKey: string
}[] = [
  { service: 'rithmic', labelKey: 'connections.sections.rithmic', addLabelKey: 'connections.add.rithmic' },
  { service: 'tradovate', labelKey: 'connections.sections.tradovate', addLabelKey: 'connections.add.tradovate' },
  { service: 'dxfeed', labelKey: 'connections.sections.dxfeed', addLabelKey: 'connections.add.dxfeed' },
  { service: 'thor', labelKey: 'connections.sections.thor', addLabelKey: 'connections.add.thor' },
]

function formatRelative(date: Date | string | null | undefined, fallback: string) {
  if (!date) return fallback
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleString()
}

function ConnectionRow({
  connection,
  onSynced,
}: {
  connection: ConnectionsPageConnection
  onSynced: () => void
}) {
  const t = useI18n()
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const { performSyncForAccount: syncTradovate } = useTradovateSyncContext()
  const { performSyncForAccount: syncDxFeed } = useDxFeedSyncContext()

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      if (connection.service === 'tradovate') {
        await syncTradovate(connection.accountId)
      } else if (connection.service === 'dxfeed') {
        await syncDxFeed(connection.accountId)
      } else {
        toast.message(t('connections.sync.manualOnly'))
      }
      onSynced()
    } catch (error) {
      console.error(error)
      toast.error(t('connections.sync.failed'))
    } finally {
      setSyncing(false)
    }
  }, [connection, onSynced, syncDxFeed, syncTradovate, t])

  return (
    <div className="t-acc" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="t-acc-head flex w-full items-center justify-between gap-4 py-6 text-left md:py-8"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="truncate text-xl font-normal tracking-tight md:text-2xl">
            {connection.externalId || connection.accountId}
          </div>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {connection.environment === 'live'
              ? t('connections.env.live')
              : t('connections.env.demo')}
            {' · '}
            {t('connections.lastSynced', {
              time: formatRelative(connection.lastSyncedAt, t('connections.neverSynced')),
            })}
            {' · '}
            {t('connections.accountCount', { count: connection.accounts.length })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(connection.service === 'tradovate' || connection.service === 'dxfeed') && (
            <span
              role="button"
              tabIndex={0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 transition-[opacity,transform] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label={t('connections.sync.now')}
              onClick={(e) => {
                e.stopPropagation()
                void handleSync()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  void handleSync()
                }
              }}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </span>
          )}
          <span className="t-acc-chevron text-black/45 dark:text-white/45" aria-hidden>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 6.5L8 10.5L12 6.5" />
            </svg>
          </span>
        </div>
      </button>
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
                    {t('connections.tradeCount', { count: account.tradeCount })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function TypeSection({
  label,
  addLabel,
  connections,
  onAdd,
  onSynced,
}: {
  label: string
  addLabel: string
  connections: ConnectionsPageConnection[]
  onAdd: () => void
  onSynced: () => void
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-normal tracking-tight md:text-2xl">{label}</h2>
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
        {connections.map((connection) => (
          <ConnectionRow
            key={connection.id}
            connection={connection}
            onSynced={onSynced}
          />
        ))}
      </div>
    </section>
  )
}

export function ConnectionsPageClient() {
  const t = useI18n()
  const [data, setData] = useState<ConnectionsPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectService, setConnectService] = useState<ConnectionService | null>(null)
  const [selectedImportPlatform, setSelectedImportPlatform] =
    useState<PlatformConfig | null>(null)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { loadAccounts: loadTradovate } = useTradovateSyncContext()
  const { loadAccounts: loadDxFeed } = useDxFeedSyncContext()

  const fileImportPlatforms = useMemo(
    () => platforms.filter((p) => p.category !== 'Direct Account Sync'),
    []
  )

  const load = useCallback(async () => {
    try {
      const next = await getConnectionsPageData()
      setData(next)
      await Promise.allSettled([loadTradovate(), loadDxFeed()])
    } catch (error) {
      console.error(error)
      toast.error(t('connections.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [loadDxFeed, loadTradovate, t])

  useEffect(() => {
    void load()
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [load])

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
      SERVICE_SECTIONS.filter(
        (section) => (byService.get(section.service)?.length ?? 0) > 0
      ),
    [byService]
  )

  const [addMenuOpen, setAddMenuOpen] = useState(false)

  return (
    <div className="min-h-[calc(100vh-var(--navbar-height,4rem))] bg-[oklch(0.97_0_0)] text-[oklch(0.17_0_0)] dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]">
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 md:py-14 lg:px-12">
        <header className={cn('mb-12 md:mb-16', !loading && 't-stagger')}>
          <h1 className="text-balance text-3xl font-normal tracking-[-0.04em] md:text-5xl">
            {t('connections.title')}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-black/55 md:text-lg dark:text-white/55">
            {t('connections.description')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAddMenuOpen((open) => !open)}
                aria-expanded={addMenuOpen}
                aria-haspopup="menu"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]"
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                {t('connections.addConnection')}
              </button>
              {addMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label={t('connections.modal.close')}
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setAddMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-2 min-w-[12rem] rounded-sm bg-white py-1 outline outline-1 outline-black/10 dark:bg-black dark:outline-white/10"
                  >
                    {SERVICE_SECTIONS.map((section) => (
                      <button
                        key={section.service}
                        type="button"
                        role="menuitem"
                        className="flex w-full px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={() => {
                          setAddMenuOpen(false)
                          setConnectService(section.service)
                        }}
                      >
                        {t(section.labelKey as 'connections.sections.rithmic')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {selectedImportPlatform ? (
              <div className="inline-flex h-11 items-center gap-1 rounded-sm border border-black/20 pl-1 pr-1 dark:border-white/20">
                <Popover open={importMenuOpen} onOpenChange={setImportMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center rounded-sm px-3 text-sm font-medium transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {t(selectedImportPlatform.name as 'import.type.csvAi.name')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-64 rounded-sm border-black/10 bg-white p-1 shadow-none dark:border-white/10 dark:bg-black"
                  >
                    <div role="menu" className="flex max-h-80 flex-col overflow-y-auto">
                      {fileImportPlatforms.map((platform) => {
                        const key = platform.type || platform.platformName
                        const selected =
                          selectedImportPlatform.platformName === platform.platformName
                        return (
                          <button
                            key={key}
                            type="button"
                            role="menuitem"
                            className={cn(
                              'flex w-full rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5',
                              selected && 'bg-black/5 dark:bg-white/5'
                            )}
                            onClick={() => {
                              setImportMenuOpen(false)
                              setSelectedImportPlatform(platform)
                            }}
                          >
                            {t(platform.name as 'import.type.csvAi.name')}
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                <button
                  type="button"
                  aria-label={t('connections.clearImportType')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => {
                    setImportMenuOpen(false)
                    setSelectedImportPlatform(null)
                  }}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <Popover open={importMenuOpen} onOpenChange={setImportMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-sm border border-black/20 px-6 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5"
                  >
                    {t('connections.selectImportType')}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-64 rounded-sm border-black/10 bg-white p-1 shadow-none dark:border-white/10 dark:bg-black"
                >
                  <div role="menu" className="flex max-h-80 flex-col overflow-y-auto">
                    {fileImportPlatforms.map((platform) => {
                      const key = platform.type || platform.platformName
                      return (
                        <button
                          key={key}
                          type="button"
                          role="menuitem"
                          className="flex w-full rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                          onClick={() => {
                            setImportMenuOpen(false)
                            setSelectedImportPlatform(platform)
                          }}
                        >
                          {t(platform.name as 'import.type.csvAi.name')}
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </header>

        {selectedImportPlatform && (
          <section className="mb-12 max-w-3xl space-y-10 border-y border-black/10 py-10 dark:border-white/10 md:mb-16 md:space-y-12 md:py-12">
            <PlatformTutorial
              selectedPlatform={selectedImportPlatform}
              setIsOpen={() => {}}
            />
            <ImportButton
              key={selectedImportPlatform.platformName}
              inline
              hideTrigger
              initialType={
                selectedImportPlatform.platformName === 'csv-ai'
                  ? 'csv-ai'
                  : selectedImportPlatform.type || selectedImportPlatform.platformName
              }
              onOpenChange={(open) => {
                if (!open) void load()
              }}
            />
          </section>
        )}

        {loading ? (
          <div className="space-y-10" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-7 w-40 animate-pulse rounded-sm bg-black/10 dark:bg-white/10" />
                <div className="h-24 animate-pulse rounded-sm bg-black/5 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-14 md:space-y-16">
            {activeSections.map((section) => (
              <TypeSection
                key={section.service}
                label={t(section.labelKey as 'connections.sections.rithmic')}
                addLabel={t(section.addLabelKey as 'connections.add.rithmic')}
                connections={byService.get(section.service) ?? []}
                onAdd={() => setConnectService(section.service)}
                onSynced={() => void load()}
              />
            ))}

            {!loading && activeSections.length === 0 && (
              <p className="border-y border-black/10 py-10 text-sm text-black/45 dark:border-white/10 dark:text-white/45">
                {t('connections.noConnectionsYet')}
              </p>
            )}

            {(data?.standaloneAccounts.length ?? 0) > 0 && (
            <section className="space-y-2">
              <h2 className="text-xl font-normal tracking-tight md:text-2xl">
                {t('connections.sections.standalone')}
              </h2>
              <ul className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
                {data!.standaloneAccounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center justify-between gap-4 py-6 md:py-8"
                  >
                    <div>
                      <div className="text-xl font-normal tracking-tight md:text-2xl">
                        {account.number}
                      </div>
                      <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                        {t('connections.standaloneHint')}
                      </p>
                    </div>
                    <span className="text-sm text-black/45 dark:text-white/45">
                      {t('connections.tradeCount', { count: account.tradeCount })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            )}
          </div>
        )}
      </div>

      <ConnectServiceModal
        service={connectService}
        onClose={() => {
          setConnectService(null)
          void load()
        }}
      />
    </div>
  )
}
