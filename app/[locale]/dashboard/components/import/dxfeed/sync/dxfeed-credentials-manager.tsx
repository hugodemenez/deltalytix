'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, Plus, RefreshCw, MoreVertical, ChevronDown, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getDxFeedErrorToastContent } from '@/lib/dxfeed-client-messages'
import { showToastWithCopy } from '@/lib/toast-copy'
import { authenticateDxFeed, updateDxFeedDailySyncTimeAction } from './actions'
import {
  useDxFeedSyncContext,
  type DxFeedSyncAccount,
} from '@/context/dxfeed-sync-context'
import {
  getDxFeedPropFirmByAuthName,
  getEnabledDxFeedPropFirms,
} from '@/lib/dxfeed-propfirms'

const DXFEED_PROP_FIRM_OPTIONS = getEnabledDxFeedPropFirms()
const DEFAULT_PROP_FIRM_ID = DXFEED_PROP_FIRM_OPTIONS[0]?.id ?? ''
const PROP_FIRM_SEARCH_THRESHOLD = 5

export function DxFeedCredentialsManager() {
  const {
    performSyncForAccount,
    performSyncForAllAccounts,
    accounts,
    deleteAccount,
    loadAccounts,
  } = useDxFeedSyncContext()

  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [reconnectingAccountId, setReconnectingAccountId] = useState<string | null>(null)
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [selectedPropFirmId, setSelectedPropFirmId] = useState(DEFAULT_PROP_FIRM_ID)
  const [dailySyncTime, setDailySyncTime] = useState<string>('')
  const [isSavingTime, setIsSavingTime] = useState(false)
  const [actionsMenuAccountId, setActionsMenuAccountId] = useState<string | null>(null)
  const [propFirmOpen, setPropFirmOpen] = useState(false)
  const [propFirmSearch, setPropFirmSearch] = useState('')
  const t = useI18n()

  const selectedPropFirm = DXFEED_PROP_FIRM_OPTIONS.find((f) => f.id === selectedPropFirmId)
  const showPropFirmSearch = DXFEED_PROP_FIRM_OPTIONS.length > PROP_FIRM_SEARCH_THRESHOLD
  const filteredPropFirms = propFirmSearch
    ? DXFEED_PROP_FIRM_OPTIONS.filter((firm) =>
        firm.name.toLowerCase().includes(propFirmSearch.toLowerCase()),
      )
    : DXFEED_PROP_FIRM_OPTIONS

  const closeActionsMenu = useCallback(() => {
    setActionsMenuAccountId(null)
  }, [])

  const resetConnectionDialog = useCallback(() => {
    setReconnectingAccountId(null)
    setLoginEmail('')
    setLoginPassword('')
    setSelectedPropFirmId(DEFAULT_PROP_FIRM_ID)
    setPropFirmOpen(false)
    setPropFirmSearch('')
  }, [])

  const handleConnectionDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open)
      if (!open) resetConnectionDialog()
    },
    [resetConnectionDialog],
  )

  const openNewConnectionDialog = useCallback(() => {
    resetConnectionDialog()
    setIsAddDialogOpen(true)
  }, [resetConnectionDialog])

  const openReconnectDialog = useCallback((connection: DxFeedSyncAccount) => {
    const propFirm = getDxFeedPropFirmByAuthName(connection.propFirmName)
    setReconnectingAccountId(connection.accountId)
    setLoginEmail(connection.accountId)
    setLoginPassword('')
    setSelectedPropFirmId(
      propFirm?.enabled ? propFirm.id : DEFAULT_PROP_FIRM_ID,
    )
    setPropFirmOpen(false)
    setPropFirmSearch('')
    setIsAddDialogOpen(true)
  }, [])

  const handleRemoveConnection = useCallback(
    async (accountId: string) => {
      try {
        await deleteAccount(accountId)
        setIsRemoveDialogOpen(false)
        toast.success(t('dxfeedSync.multiAccount.connectionRemoved', { accountId }))
      } catch (error) {
        toast.error(t('dxfeedSync.multiAccount.removeError', { accountId }))
        console.error('Remove connection error:', error)
      }
    },
    [t, deleteAccount],
  )

  const handleAddAccount = useCallback(async () => {
    if (!selectedPropFirmId) {
      toast.error(t('dxfeedSync.error.propFirmRequired'))
      return
    }
    if (!loginEmail || !loginPassword) {
      toast.error(t('dxfeedSync.error.credentialsRequired'))
      return
    }

    try {
      setIsLoading(true)
      const result = await authenticateDxFeed(
        loginEmail,
        loginPassword,
        selectedPropFirmId,
        reconnectingAccountId ?? undefined,
      )

      if (result.error) {
        const { title, description } = getDxFeedErrorToastContent(
          t,
          result.error,
          result.errorParams,
        )
        showToastWithCopy('error', title, {
          description,
          copyLabel: t('common.copy'),
        })
        return
      }

      showToastWithCopy('success', t('dxfeedSync.connected'), {
        copyLabel: t('common.copy'),
      })
      handleConnectionDialogOpenChange(false)
      await loadAccounts()
    } catch (error) {
      console.error('DxFeed connect error:', error)
      showToastWithCopy('error', t('dxfeedSync.error.authFailed'), {
        description: t('dxfeedSync.errors.hintCheckCredentials'),
        copyLabel: t('common.copy'),
      })
    } finally {
      setIsLoading(false)
    }
  }, [
    loginEmail,
    loginPassword,
    selectedPropFirmId,
    reconnectingAccountId,
    t,
    loadAccounts,
    handleConnectionDialogOpenChange,
  ])

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  const handleReloadAccounts = useCallback(async () => {
    try {
      setIsReloading(true)
      const loaded = await loadAccounts()
      if (loaded) {
        toast.success(t('dxfeedSync.multiAccount.accountsReloaded'))
      }
    } catch (error) {
      toast.error(t('dxfeedSync.multiAccount.reloadError'), {
        description: t('dxfeedSync.errors.hintContactSupport'),
      })
      console.error('Reload error:', error)
    } finally {
      setIsReloading(false)
    }
  }, [loadAccounts, t])

  const handleSetDailySyncTime = useCallback(
    (accountId: string, currentTime: Date | null) => {
      setSelectedAccountId(accountId)
      if (currentTime) {
        const utcDate = new Date(currentTime)
        const localHours = utcDate.getHours().toString().padStart(2, '0')
        const localMinutes = utcDate.getMinutes().toString().padStart(2, '0')
        setDailySyncTime(`${localHours}:${localMinutes}`)
      } else {
        setDailySyncTime('')
      }
      setIsTimeDialogOpen(true)
    },
    [],
  )

  const handleSaveDailySyncTime = useCallback(async () => {
    if (!selectedAccountId) return

    try {
      setIsSavingTime(true)

      let utcTimeString: string | null = null
      if (dailySyncTime) {
        const [hours, minutes] = dailySyncTime.split(':').map(Number)
        const localDate = new Date()
        localDate.setHours(hours, minutes, 0, 0)
        utcTimeString = localDate.toISOString()
      }

      const result = await updateDxFeedDailySyncTimeAction(selectedAccountId, utcTimeString)

      if (result.success) {
        toast.success(t('dxfeedSync.multiAccount.dailySyncTimeUpdated'))
        setIsTimeDialogOpen(false)
        await loadAccounts()
      } else {
        const { title, description } = getDxFeedErrorToastContent(t, result.error)
        toast.error(title || t('dxfeedSync.multiAccount.dailySyncTimeUpdateError'), {
          description,
        })
      }
    } catch (error) {
      toast.error(t('dxfeedSync.multiAccount.dailySyncTimeUpdateError'))
      console.error('Update sync time error:', error)
    } finally {
      setIsSavingTime(false)
    }
  }, [selectedAccountId, dailySyncTime, loadAccounts, t])

  const handlePresetTime = useCallback((preset: string) => {
    let hours: number
    let minutes: number

    switch (preset) {
      case 'midday':
        hours = 12
        minutes = 0
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
        minutes = 0
        break
      case 'morning':
        hours = 8
        minutes = 0
        break
      default:
        return
    }

    setDailySyncTime(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    )
  }, [])

  function formatDailySyncTimeValue(date: Date | null): string | null {
    if (!date) return null

    const utcDate = new Date(date)
    const localHours = utcDate.getHours().toString().padStart(2, '0')
    const localMinutes = utcDate.getMinutes().toString().padStart(2, '0')

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(new Date())
    const tzName = parts.find((part) => part.type === 'timeZoneName')?.value || ''

    return `${localHours}:${localMinutes} ${tzName}`
  }

  return (
    <div className="space-y-4 min-w-0 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold truncate">
            {t('dxfeedSync.multiAccount.savedAccounts')}
          </h3>
          <Button
            onClick={handleReloadAccounts}
            size="sm"
            variant="ghost"
            disabled={isReloading}
            className="h-8 w-8 p-0 shrink-0"
            aria-label={t('dxfeedSync.multiAccount.reloadAccounts')}
          >
            {isReloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            onClick={async () => {
              await performSyncForAllAccounts()
            }}
            size="sm"
            variant="outline"
            disabled={syncingId !== null}
            className="h-8 flex-1 sm:flex-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="truncate">{t('dxfeedSync.multiAccount.syncAll')}</span>
          </Button>
          <Button
            onClick={openNewConnectionDialog}
            disabled={isLoading}
            size="sm"
            className="h-8 flex-1 sm:flex-none"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {t('dxfeedSync.multiAccount.addNew')}
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="border rounded-lg px-4 py-8 text-center text-muted-foreground text-sm">
          {t('dxfeedSync.multiAccount.noSavedAccounts')}
        </div>
      ) : (
        <Accordion type="multiple" className="rounded-lg border divide-y">
          {accounts.map((connection) => {
            const tradingAccountCount = connection.accountNumbers.length
            const isConnected =
              connection.hasToken && !connection.tokenExpired && !connection.needsReconnect

            return (
              <AccordionItem
                key={connection.accountId}
                value={connection.accountId}
                className="border-0"
              >
                <div className="flex min-w-0 flex-col">
                  <div className="flex min-w-0 items-start gap-2 px-3 py-2.5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {connection.propFirmName ?? '—'}
                        </p>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium leading-none ${
                            isConnected
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : connection.needsReconnect
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {isConnected
                            ? t('dxfeedSync.multiAccount.connected')
                            : connection.needsReconnect
                              ? t('dxfeedSync.multiAccount.reconnectRequired')
                              : t('dxfeedSync.multiAccount.expired')}
                        </span>
                      </div>
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={connection.accountId}
                      >
                        {connection.accountId}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          {t('dxfeedSync.multiAccount.lastSync')}:{' '}
                          <span className="text-foreground/75">
                            {formatDate(connection.lastSyncedAt.toISOString())}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {t('dxfeedSync.multiAccount.dailySyncSchedule')}:
                          {connection.dailySyncTime ? (
                            <>
                              <span className="text-foreground/75">
                                {formatDailySyncTimeValue(connection.dailySyncTime)}
                              </span>
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="-mx-1 h-auto min-h-6 px-1 py-1 text-xs font-normal"
                                onClick={() =>
                                  handleSetDailySyncTime(
                                    connection.accountId,
                                    connection.dailySyncTime,
                                  )
                                }
                              >
                                {t('dxfeedSync.multiAccount.editSchedule')}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="-mx-1 h-auto min-h-6 px-1 py-1 text-xs font-normal"
                              onClick={() =>
                                handleSetDailySyncTime(
                                  connection.accountId,
                                  connection.dailySyncTime,
                                )
                              }
                            >
                              {t('dxfeedSync.multiAccount.scheduleSync')}
                            </Button>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {!isConnected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReconnectDialog(connection)}
                          className="h-7 px-2 text-xs"
                        >
                          {t('dxfeedSync.multiAccount.reconnect')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setSyncingId(connection.accountId)
                          await performSyncForAccount(connection.accountId)
                          setSyncingId(null)
                        }}
                        disabled={syncingId !== null || !isConnected}
                        className="h-7 w-7 p-0 shrink-0"
                        title={t('dxfeedSync.multiAccount.syncAll')}
                        aria-label={t('dxfeedSync.multiAccount.syncAccount', {
                          accountId: connection.accountId,
                        })}
                      >
                        {syncingId === connection.accountId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Popover
                        modal
                        open={actionsMenuAccountId === connection.accountId}
                        onOpenChange={(open) =>
                          setActionsMenuAccountId(open ? connection.accountId : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            aria-label={t('dxfeedSync.multiAccount.accountActions', {
                              accountId: connection.accountId,
                            })}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-2" align="end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-destructive hover:text-destructive"
                            onClick={() => {
                              closeActionsMenu()
                              setSelectedAccountId(connection.accountId)
                              setIsRemoveDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('dxfeedSync.multiAccount.removeConnection')}
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <AccordionTrigger className="w-full border-t px-3 py-1.5 flex items-center justify-center gap-1.5 text-xs font-normal text-muted-foreground hover:bg-muted/30 hover:no-underline [&[data-state=open]>svg]:rotate-180 [&[data-state=open]_.expand-when-closed]:hidden [&[data-state=open]_.expand-when-open]:inline-flex">
                    <span className="expand-when-closed inline-flex items-center gap-1.5">
                      {t('dxfeedSync.multiAccount.expandTradingAccounts', {
                        count: tradingAccountCount,
                      })}
                    </span>
                    <span className="expand-when-open hidden items-center gap-1.5">
                      {t('dxfeedSync.multiAccount.collapseTradingAccounts')}
                    </span>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="px-3 pb-2.5 pt-0">
                  {tradingAccountCount > 0 ? (
                    <ul className="divide-y divide-border/60">
                      {connection.accountNumbers.map((name) => (
                        <li
                          key={name}
                          className="py-1.5 font-mono text-xs text-foreground/90 first:pt-0 last:pb-0"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-1 text-xs text-muted-foreground">
                      {t('dxfeedSync.multiAccount.noTradingAccounts')}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                    {t('dxfeedSync.multiAccount.syncImportsAllAccounts')}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleConnectionDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reconnectingAccountId
                ? t('dxfeedSync.addAccount.reconnectTitle')
                : t('dxfeedSync.addAccount.title')}
            </DialogTitle>
            <DialogDescription>
              {reconnectingAccountId
                ? t('dxfeedSync.addAccount.reconnectDescription', {
                    accountId: reconnectingAccountId,
                  })
                : t('dxfeedSync.addAccount.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {DXFEED_PROP_FIRM_OPTIONS.length === 0 ? (
              <Alert variant="destructive">
                <AlertTitle>{t('dxfeedSync.addAccount.noPropFirmsTitle')}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{t('dxfeedSync.addAccount.noPropFirmsDescription')}</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/support">{t('dxfeedSync.addAccount.noPropFirmsAction')}</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
            <div className="space-y-2">
              <Label htmlFor="dxfeed-prop-firm">{t('dxfeedSync.addAccount.propFirmLabel')}</Label>
              <Popover
                open={propFirmOpen}
                onOpenChange={(open) => {
                  setPropFirmOpen(open)
                  if (!open) setPropFirmSearch('')
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="dxfeed-prop-firm"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={propFirmOpen}
                    className="h-10 w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedPropFirm?.name ?? t('dxfeedSync.addAccount.propFirmPlaceholder')}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    {showPropFirmSearch ? (
                      <CommandInput
                        placeholder={t('filters.searchPropfirm')}
                        value={propFirmSearch}
                        onValueChange={setPropFirmSearch}
                      />
                    ) : null}
                    <CommandList
                      className={
                        showPropFirmSearch ? 'max-h-[min(280px,50vh)] overflow-y-auto' : undefined
                      }
                    >
                      <CommandEmpty>{t('filters.noPropfirmFound')}</CommandEmpty>
                      <CommandGroup>
                        {filteredPropFirms.map((firm) => (
                          <CommandItem
                            key={firm.id}
                            value={firm.id}
                            onSelect={() => {
                              setSelectedPropFirmId(firm.id)
                              setPropFirmOpen(false)
                              setPropFirmSearch('')
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                selectedPropFirmId === firm.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <span className="truncate">{firm.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dxfeed-email">{t('dxfeedSync.addAccount.emailLabel')}</Label>
              <Input
                id="dxfeed-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder={t('dxfeedSync.addAccount.emailPlaceholder')}
                readOnly={reconnectingAccountId !== null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dxfeed-password">{t('dxfeedSync.addAccount.passwordLabel')}</Label>
              <Input
                id="dxfeed-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={t('dxfeedSync.addAccount.passwordPlaceholder')}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => handleConnectionDialogOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleAddAccount}
                disabled={
                  isLoading ||
                  !selectedPropFirmId ||
                  DXFEED_PROP_FIRM_OPTIONS.length === 0
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('dxfeedSync.addAccount.connecting')}
                  </>
                ) : (
                  reconnectingAccountId
                    ? t('dxfeedSync.multiAccount.reconnect')
                    : t('dxfeedSync.addAccount.connect')
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Connection Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dxfeedSync.multiAccount.removeConnection')}</DialogTitle>
            <DialogDescription>
              {t('dxfeedSync.multiAccount.removeConnectionConfirm', {
                accountId: selectedAccountId,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedAccountId && handleRemoveConnection(selectedAccountId)
              }
            >
              {t('dxfeedSync.multiAccount.remove')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Sync Time Dialog */}
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dxfeedSync.multiAccount.dailySyncTimeTitle')}</DialogTitle>
            <DialogDescription>
              {t('dxfeedSync.multiAccount.dailySyncTimeDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('dxfeedSync.multiAccount.quickPresets')}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('morning')}
                >
                  {t('dxfeedSync.multiAccount.presets.morning')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('midday')}
                >
                  {t('dxfeedSync.multiAccount.presets.midday')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('after-close')}
                >
                  {t('dxfeedSync.multiAccount.presets.afterClose')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('midnight')}
                >
                  {t('dxfeedSync.multiAccount.presets.midnight')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncTime">
                {t('dxfeedSync.multiAccount.dailySyncTimeLabel')}
              </Label>
              <Input
                id="syncTime"
                type="time"
                value={dailySyncTime}
                onChange={(e) => setDailySyncTime(e.target.value)}
                placeholder={t('dxfeedSync.multiAccount.dailySyncTimePlaceholder')}
              />
              <p className="text-sm text-muted-foreground">
                {t('dxfeedSync.multiAccount.dailySyncTimeTimezoneNote', {
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsTimeDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveDailySyncTime} disabled={isSavingTime}>
                {isSavingTime ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
