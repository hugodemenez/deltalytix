'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
} from 'react'
import Link from 'next/link'
import { ChevronDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { useData } from '@/context/data-provider'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { removeAccountsFromTradesAction } from '@/server/accounts'
import { moveAccountToGroupAction } from '@/server/groups'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
  ConnectionsPageData,
} from '@/app/[locale]/dashboard/connections/types'
import { HIDDEN_GROUP_NAME } from '@/app/[locale]/dashboard/components/filters/account-group-board'
import {
  buildStripItems,
  chipAccountCountLabel,
  isStandaloneAccount,
  mapConnectionsAccounts,
  removeConnectionsAccount,
  type StripItem,
} from './connections-strip-items'
import { ConnectionsStripAccountRow } from './connections-strip-account-row'

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
        groupId: account.groupId ?? null,
        createdAt: reviveDate(account.createdAt) ?? new Date(0),
      })),
    })),
    standaloneAccounts: (parsed.standaloneAccounts ?? []).map((account) => ({
      ...account,
      groupId: account.groupId ?? null,
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

function ChipTrigger({
  item,
  open,
  showChevron = true,
  numericCount = false,
  className,
  ...props
}: {
  item: StripItem
  open: boolean
  showChevron?: boolean
  numericCount?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const t = useI18n()
  const meta = chipAccountCountLabel(item.accounts.length, t, {
    numericOnly: numericCount,
  })
  const statusLabel =
    item.status === 'connected'
      ? t('connections.status.connected')
      : item.status === 'error'
        ? t('connections.status.error')
        : t('connections.status.offline')

  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cn(
        'inline-flex h-9 max-w-[16rem] shrink-0 items-center gap-2 rounded-[4px] border bg-white px-3 text-left text-sm tracking-[-0.01em] transition-[background-color,border-color,transform] duration-150 hover:bg-[#F5F5F5] active:scale-[0.96] dark:bg-background dark:hover:bg-muted/50',
        open
          ? 'border-[#181A18] dark:border-white'
          : 'border-[#E5E5E5] dark:border-border',
        className
      )}
      {...props}
    >
      <span className="min-w-0 truncate font-medium text-[#171917] dark:text-foreground">
        {item.displayName}
      </span>
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          item.status === 'connected' && 'bg-[#3E7550]',
          item.status === 'error' && 'bg-red-500',
          item.status === 'offline' && 'bg-[#A3A3A3]'
        )}
        aria-label={statusLabel}
      />
      {meta ? (
        <span className="min-w-0 truncate text-xs text-[#686D67] dark:text-muted-foreground">
          {meta}
        </span>
      ) : null}
      {showChevron ? (
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-[#686D67] transition-transform duration-150 dark:text-muted-foreground',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      ) : null}
    </button>
  )
}

function AccountPickerList({
  item,
  selectedAccounts,
  searchTerm,
  hiddenGroupId,
  maskingAccountId,
  deletingAccountId,
  onSearchTermChange,
  onSelectAccount,
  onClose,
  onMask,
  onRename,
  onDelete,
  listClassName,
}: {
  item: StripItem
  selectedAccounts: string[]
  searchTerm: string
  hiddenGroupId: string | null
  maskingAccountId: string | null
  deletingAccountId: string | null
  onSearchTermChange: (value: string) => void
  onSelectAccount: (accountNumber: string) => void
  onClose: () => void
  onMask: (account: ConnectionsPageAccount, masked: boolean) => void
  onRename: (
    account: ConnectionsPageAccount,
    nextName: string
  ) => Promise<boolean>
  onDelete: (account: ConnectionsPageAccount) => Promise<void>
  listClassName: string
}) {
  const t = useI18n()
  const [accountToDelete, setAccountToDelete] =
    useState<ConnectionsPageAccount | null>(null)
  const query = searchTerm.trim().toLowerCase()
  const filteredAccounts = useMemo(() => {
    if (!query) return item.accounts
    return item.accounts.filter((account) => {
      const number = account.number.toLowerCase()
      const propfirm = account.propfirm?.trim().toLowerCase() ?? ''
      return number.includes(query) || propfirm.includes(query)
    })
  }, [item.accounts, query])

  return (
    <>
      <Command shouldFilter={false} className="bg-transparent">
        <CommandInput
          value={searchTerm}
          onValueChange={onSearchTermChange}
          placeholder={t('connections.strip.search')}
        />
        <CommandList className={cn('overflow-y-auto overflow-x-hidden', listClassName)}>
          <CommandEmpty>
            {item.accounts.length === 0
              ? t('connections.emptySection')
              : t('connections.strip.noResults')}
          </CommandEmpty>
          <CommandGroup>
            {filteredAccounts.map((account) => (
              <ConnectionsStripAccountRow
                key={account.id}
                account={account}
                selected={selectedAccounts.includes(account.number)}
                hiddenGroupId={hiddenGroupId}
                canDelete={isStandaloneAccount(account)}
                masking={maskingAccountId === account.id}
                deleting={deletingAccountId === account.id}
                onSelect={(accountNumber) => {
                  onSelectAccount(accountNumber)
                  onClose()
                }}
                onMask={onMask}
                onRename={onRename}
                onRequestDelete={setAccountToDelete}
              />
            ))}
          </CommandGroup>
        </CommandList>
        <div className="border-t border-[#E5E5E5] dark:border-border">
          <Link
            href="/dashboard/connections"
            className="block px-3 py-2.5 text-sm font-medium text-[#3E7550] transition-colors hover:bg-[#EFF5EC] dark:text-[#9BC4A8] dark:hover:bg-[#243028]"
            onClick={onClose}
          >
            {t('connections.manageConnection')}
          </Link>
        </div>
      </Command>
      <AlertDialog
        open={accountToDelete != null}
        onOpenChange={(open) => {
          if (!open) setAccountToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('connections.strip.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('connections.strip.deleteConfirmDescription', {
                account: accountToDelete?.number ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!accountToDelete) return
                void onDelete(accountToDelete)
                setAccountToDelete(null)
              }}
            >
              {t('connections.strip.deleteConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ConnectionChip({
  item,
  selectedAccounts,
  hiddenGroupId,
  maskingAccountId,
  deletingAccountId,
  onSelectAccount,
  onMask,
  onRename,
  onDelete,
}: {
  item: StripItem
  selectedAccounts: string[]
  hiddenGroupId: string | null
  maskingAccountId: string | null
  deletingAccountId: string | null
  onSelectAccount: (accountNumber: string) => void
  onMask: (account: ConnectionsPageAccount, masked: boolean) => void
  onRename: (
    account: ConnectionsPageAccount,
    nextName: string
  ) => Promise<boolean>
  onDelete: (account: ConnectionsPageAccount) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSearchTerm('')
  }

  const picker = (listClassName: string) => (
    <AccountPickerList
      item={item}
      selectedAccounts={selectedAccounts}
      searchTerm={searchTerm}
      hiddenGroupId={hiddenGroupId}
      maskingAccountId={maskingAccountId}
      deletingAccountId={deletingAccountId}
      onSearchTermChange={setSearchTerm}
      onSelectAccount={onSelectAccount}
      onClose={() => handleOpenChange(false)}
      onMask={onMask}
      onRename={onRename}
      onDelete={onDelete}
      listClassName={listClassName}
    />
  )

  if (isMobile) {
    return (
      <>
        <ChipTrigger
          item={item}
          open={open}
          showChevron={false}
          numericCount
          onClick={() => setOpen(true)}
        />
        <Drawer
          open={open}
          onOpenChange={handleOpenChange}
          shouldScaleBackground={false}
        >
          <DrawerContent className="max-h-[85svh] rounded-t-[4px] border-[#E5E5E5] bg-white dark:border-border dark:bg-background">
            <DrawerHeader className="px-4 pb-2 pt-3 text-left">
              <DrawerTitle className="text-base font-semibold text-[#171917] dark:text-foreground">
                {item.displayName}
              </DrawerTitle>
            </DrawerHeader>
            {picker(
              'max-h-[min(320px,50svh)] pb-[max(0.5rem,env(safe-area-inset-bottom))]'
            )}
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ChipTrigger item={item} open={open} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-[4px] border-[#E5E5E5] bg-white p-0 shadow-md dark:border-border dark:bg-background"
      >
        {picker('max-h-[320px]')}
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
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('connections.addChip')}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[4px] border border-[#E5E5E5] bg-white text-[#686D67] transition-[background-color,border-color,transform,color] duration-150 hover:border-[#181A18]/40 hover:bg-[#F5F5F5] hover:text-[#171917] active:scale-[0.96] dark:border-border dark:bg-background dark:hover:bg-muted/50 dark:hover:text-foreground',
            isMobile ? 'size-8' : 'size-9'
          )}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-[12rem] rounded-[4px] border-[#E5E5E5] bg-white p-1 shadow-md dark:border-border dark:bg-background"
      >
        <div role="menu" className="flex flex-col">
          {SERVICE_SECTIONS.map((section) => (
            <button
              key={section.service}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-[3px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F5F5F5] dark:hover:bg-muted/50"
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
          <div className="my-1 border-t border-[#E5E5E5] dark:border-border" />
          <Link
            href="/dashboard/connections"
            role="menuitem"
            className="rounded-[3px] px-3 py-2.5 text-sm transition-colors hover:bg-[#F5F5F5] dark:hover:bg-muted/50"
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
  const {
    accountNumbers = [],
    setAccountNumbers,
    saveGroup,
    saveAccount,
    moveAccountsToGroup,
    refreshTradesOnly,
  } = useData()
  const groups = useUserStore((state) => state.groups)
  const updateAccount = useUserStore((state) => state.updateAccount)
  const removeAccount = useUserStore((state) => state.removeAccount)
  const setGroups = useUserStore((state) => state.setGroups)
  const setTrades = useTradesStore((state) => state.setTrades)
  const [data, setData] = useState<ConnectionsPageData | null>(null)
  const [connectService, setConnectService] = useState<ConnectionService | null>(
    null
  )
  const [maskingAccountId, setMaskingAccountId] = useState<string | null>(null)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)

  const hiddenGroupId = useMemo(
    () => groups.find((group) => group.name === HIDDEN_GROUP_NAME)?.id ?? null,
    [groups]
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    void load()
  }, [load])

  const items = useMemo(
    () => buildStripItems(data, t('connections.strip.standalone')),
    [data, t]
  )

  const applyAccountPatch = useCallback(
    (accountId: string, patch: Partial<ConnectionsPageAccount>) => {
      setData((prev) =>
        prev
          ? mapConnectionsAccounts(prev, (account) =>
              account.id === accountId ? { ...account, ...patch } : account
            )
          : prev
      )
    },
    []
  )

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

  const ensureHiddenGroup = useCallback(async () => {
    if (hiddenGroupId) return hiddenGroupId
    const created = await saveGroup(HIDDEN_GROUP_NAME)
    return created?.id ?? null
  }, [hiddenGroupId, saveGroup])

  const onMask = useCallback(
    async (account: ConnectionsPageAccount, masked: boolean) => {
      const previousGroupId = account.groupId
      setMaskingAccountId(account.id)
      try {
        const nextGroupId = masked ? await ensureHiddenGroup() : null
        if (masked && !nextGroupId) {
          throw new Error('HIDDEN_GROUP_MISSING')
        }
        applyAccountPatch(account.id, { groupId: nextGroupId })
        const storeAccounts = useUserStore.getState().accounts
        if (storeAccounts.some((item) => item.id === account.id)) {
          await moveAccountsToGroup([account.id], nextGroupId)
        } else {
          await moveAccountToGroupAction(account.id, nextGroupId)
        }
      } catch {
        applyAccountPatch(account.id, { groupId: previousGroupId })
        toast.error(t('connections.strip.maskFailed'))
      } finally {
        setMaskingAccountId(null)
      }
    },
    [applyAccountPatch, ensureHiddenGroup, moveAccountsToGroup, t]
  )

  const onRename = useCallback(
    async (account: ConnectionsPageAccount, nextName: string) => {
      const storeAccount = useUserStore
        .getState()
        .accounts.find(
          (item) => item.id === account.id || item.number === account.number
        )
      if (!storeAccount) {
        toast.error(t('connections.strip.renameFailed'))
        return false
      }
      try {
        await saveAccount({ ...storeAccount, propfirm: nextName })
        applyAccountPatch(account.id, { propfirm: nextName })
        updateAccount(account.id, { propfirm: nextName })
        setGroups(
          useUserStore.getState().groups.map((group) => ({
            ...group,
            accounts: group.accounts.map((item) =>
              item.id === account.id ? { ...item, propfirm: nextName } : item
            ),
          }))
        )
        return true
      } catch {
        toast.error(t('connections.strip.renameFailed'))
        return false
      }
    },
    [applyAccountPatch, saveAccount, setGroups, t, updateAccount]
  )

  const onDelete = useCallback(
    async (account: ConnectionsPageAccount) => {
      if (!isStandaloneAccount(account)) return
      setDeletingAccountId(account.id)
      try {
        await removeAccountsFromTradesAction([account.number])
        setData((prev) =>
          prev ? removeConnectionsAccount(prev, account.id) : prev
        )
        removeAccount(account.id)
        setGroups(
          useUserStore.getState().groups.map((group) => ({
            ...group,
            accounts: group.accounts.filter((item) => item.id !== account.id),
          }))
        )
        setTrades(
          useTradesStore
            .getState()
            .trades.filter((trade) => trade.accountNumber !== account.number)
        )
        setAccountNumbers((prev) =>
          prev.filter((number) => number !== account.number)
        )
        await refreshTradesOnly({ force: false })
        toast.success(
          t('connections.strip.accountDeleted', { account: account.number })
        )
      } catch {
        toast.error(t('connections.strip.deleteFailed'))
      } finally {
        setDeletingAccountId(null)
      }
    },
    [
      refreshTradesOnly,
      removeAccount,
      setAccountNumbers,
      setGroups,
      setTrades,
      t,
    ]
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
            hiddenGroupId={hiddenGroupId}
            maskingAccountId={maskingAccountId}
            deletingAccountId={deletingAccountId}
            onSelectAccount={onSelectAccount}
            onMask={onMask}
            onRename={onRename}
            onDelete={onDelete}
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
