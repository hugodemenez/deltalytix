'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { useData } from '@/context/data-provider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ServiceMonochromeLogo } from '@/components/monochrome-logo'
import { captureConnectionAddClicked } from '@/lib/connection-analytics'
import { ConnectServiceModal } from '@/app/[locale]/dashboard/connections/components/connect-service-modal'
import type {
  ConnectionService,
  ConnectionsPageAccount,
  ConnectionsPageConnection,
  ConnectionsPageData,
} from '@/app/[locale]/dashboard/connections/types'

const SERVICE_SECTIONS: {
  service: ConnectionService
  labelKey: string
}[] = [
  {
    service: 'rithmic-protocol',
    labelKey: 'connections.sections.rithmicProtocol',
  },
  { service: 'tradovate', labelKey: 'connections.sections.tradovate' },
  { service: 'dxfeed', labelKey: 'connections.sections.dxfeed' },
  { service: 'ibkr', labelKey: 'connections.sections.ibkr' },
  { service: 'thor', labelKey: 'connections.sections.thor' },
]

type StripItem =
  | {
      kind: 'connection'
      id: string
      displayName: string
      status: 'connected' | 'error'
      service: string
      accounts: ConnectionsPageAccount[]
    }
  | {
      kind: 'standalone'
      id: string
      displayName: string
      status: 'connected'
      service: string | null
      accounts: ConnectionsPageAccount[]
    }

function reviveDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

function reviveConnectionsPageData(
  parsed: ConnectionsPageData
): ConnectionsPageData {
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

async function fetchConnectionsPageData(): Promise<ConnectionsPageData> {
  const response = await fetch('/api/connections/page-data', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`CONNECTIONS_LOAD_FAILED:${response.status}`)
  }
  const json = (await response.json()) as
    | ConnectionsPageData
    | { error?: string }
  if (!json || typeof json !== 'object' || !('connections' in json)) {
    throw new Error('CONNECTIONS_LOAD_FAILED:invalid_payload')
  }
  return reviveConnectionsPageData(json)
}

function accountMetaLabel(
  account: ConnectionsPageAccount,
  t: ReturnType<typeof useI18n>
): string | null {
  const parts: string[] = []
  if (account.propfirm) {
    parts.push(account.propfirm)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function chipMeta(
  item: StripItem,
  t: ReturnType<typeof useI18n>
): string {
  if (item.accounts.length === 1) {
    return item.accounts[0].number
  }
  return t('connections.accountCount.other', { count: item.accounts.length })
}

function buildStripItems(data: ConnectionsPageData | null): StripItem[] {
  if (!data) return []

  const connectionItems: StripItem[] = data.connections.map(
    (connection: ConnectionsPageConnection) => ({
      kind: 'connection' as const,
      id: connection.id,
      displayName: connection.displayName,
      status: connection.status,
      service: connection.service,
      accounts: connection.accounts,
    })
  )

  // Group standalone accounts by propfirm label when shared; otherwise one chip each.
  const standaloneByLabel = new Map<string, ConnectionsPageAccount[]>()
  for (const account of data.standaloneAccounts) {
    const label =
      account.propfirm?.trim() ||
      account.number ||
      'standalone'
    const list = standaloneByLabel.get(label) ?? []
    list.push(account)
    standaloneByLabel.set(label, list)
  }

  const standaloneItems: StripItem[] = Array.from(
    standaloneByLabel.entries()
  ).map(([label, accounts]) => ({
    kind: 'standalone' as const,
    id: `standalone:${label}`,
    displayName: label,
    status: 'connected' as const,
    service: null,
    accounts,
  }))

  return [...connectionItems, ...standaloneItems]
}

function ConnectionChip({
  item,
  selectedAccounts,
  onSelectAccount,
}: {
  item: StripItem
  selectedAccounts: string[]
  onSelectAccount: (accountNumber: string) => void
}) {
  const t = useI18n()
  const [open, setOpen] = useState(false)
  const meta = chipMeta(item, t)
  const connected = item.status === 'connected'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            'inline-flex h-9 max-w-[16rem] shrink-0 items-center gap-2 rounded-full border bg-white px-3 text-left text-sm transition-[background-color,border-color,transform] duration-150 hover:bg-[#F2F2EE] active:scale-[0.98] dark:bg-background dark:hover:bg-muted/50',
            open
              ? 'border-[#181A18] dark:border-white'
              : 'border-[#E2E5DF] dark:border-border'
          )}
        >
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
            {item.service ? (
              <ServiceMonochromeLogo
                service={item.service}
                alt=""
                size={16}
                className="h-4 w-4"
              />
            ) : (
              <span
                className="h-2 w-2 rounded-full bg-[#181A18]/35 dark:bg-white/40"
                aria-hidden
              />
            )}
          </span>
          <span className="min-w-0 truncate font-medium text-[#171917] dark:text-foreground">
            {item.displayName}
          </span>
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              connected ? 'bg-[#3E7550]' : 'bg-red-500'
            )}
            aria-label={
              connected
                ? t('connections.status.connected')
                : t('connections.status.error')
            }
          />
          <span className="min-w-0 truncate text-xs text-[#686D67] dark:text-muted-foreground">
            {meta}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[#686D67] transition-transform duration-150 dark:text-muted-foreground',
              open && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-72 rounded-xl border-[#E2E5DF] bg-white p-1 shadow-md dark:border-border dark:bg-background"
      >
        <div role="menu" className="flex flex-col">
          {item.accounts.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[#686D67] dark:text-muted-foreground">
              {t('connections.emptySection')}
            </p>
          ) : (
            item.accounts.map((account) => {
              const selected = selectedAccounts.includes(account.number)
              const metaLabel = accountMetaLabel(account, t)
              return (
                <button
                  key={account.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selected}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F2F2EE] dark:hover:bg-muted/50"
                  onClick={() => {
                    onSelectAccount(account.number)
                    setOpen(false)
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#171917] dark:text-foreground">
                      {account.number}
                    </span>
                    {metaLabel ? (
                      <span className="block truncate text-xs text-[#686D67] dark:text-muted-foreground">
                        {metaLabel}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-[#3E7550]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                </button>
              )
            })
          )}
          <div className="my-1 border-t border-[#E2E5DF] dark:border-border" />
          <Link
            href="/dashboard/connections"
            role="menuitem"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#3E7550] transition-colors hover:bg-[#EFF5EC] dark:text-[#9BC4A8] dark:hover:bg-[#243028]"
            onClick={() => setOpen(false)}
          >
            {t('connections.manageConnection')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AddConnectionChip({
  onSelectService,
}: {
  onSelectService: (service: ConnectionService) => void
}) {
  const t = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('connections.addChip')}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#E2E5DF] bg-transparent px-3 text-sm font-medium text-[#686D67] transition-[background-color,border-color,transform,color] duration-150 hover:border-[#181A18]/40 hover:bg-[#F2F2EE] hover:text-[#171917] active:scale-[0.98] dark:border-border dark:hover:bg-muted/50 dark:hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          {t('connections.addChip')}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-[12rem] rounded-xl border-[#E2E5DF] bg-white p-1 shadow-md dark:border-border dark:bg-background"
      >
        <div role="menu" className="flex flex-col">
          {SERVICE_SECTIONS.map((section) => (
            <button
              key={section.service}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F2F2EE] dark:hover:bg-muted/50"
              onClick={() => {
                setOpen(false)
                captureConnectionAddClicked(section.service)
                onSelectService(section.service)
              }}
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <ServiceMonochromeLogo
                  service={section.service}
                  alt=""
                  size={20}
                  className="h-5 w-5"
                />
              </span>
              {t(section.labelKey as 'connections.sections.tradovate')}
            </button>
          ))}
          <div className="my-1 border-t border-[#E2E5DF] dark:border-border" />
          <Link
            href="/dashboard/connections"
            role="menuitem"
            className="rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-[#F2F2EE] dark:hover:bg-muted/50"
            onClick={() => setOpen(false)}
          >
            {t('connections.importFile')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Horizontal connections strip for dashboard home (Widgets / Table / Accounts).
 * Connection chips ≠ Accounts-tab Groups.
 */
export function ConnectionsStrip({ className }: { className?: string }) {
  const t = useI18n()
  const { accountNumbers = [], setAccountNumbers } = useData()
  const [data, setData] = useState<ConnectionsPageData | null>(null)
  const [connectService, setConnectService] = useState<ConnectionService | null>(
    null
  )

  const load = useCallback(async () => {
    try {
      const next = await fetchConnectionsPageData()
      setData(next)
    } catch {
      // Keep last good data; strip is progressive enhancement.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const items = useMemo(() => buildStripItems(data), [data])

  const onSelectAccount = useCallback(
    (accountNumber: string) => {
      setAccountNumbers((prev) => {
        if (prev.length === 1 && prev[0] === accountNumber) {
          return []
        }
        return [accountNumber]
      })
    },
    [setAccountNumbers]
  )

  return (
    <>
      <div
        className={cn(
          'flex w-full items-center gap-2 overflow-x-auto px-3 py-2 sm:px-4',
          className
        )}
        role="navigation"
        aria-label={t('connections.stripLabel')}
      >
        {items.map((item) => (
          <ConnectionChip
            key={item.id}
            item={item}
            selectedAccounts={accountNumbers}
            onSelectAccount={onSelectAccount}
          />
        ))}
        <AddConnectionChip onSelectService={setConnectService} />
      </div>

      <ConnectServiceModal
        service={connectService}
        onClose={() => {
          setConnectService(null)
          void load()
        }}
      />
    </>
  )
}
