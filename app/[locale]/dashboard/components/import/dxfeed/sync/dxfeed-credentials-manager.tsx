'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, Plus, RefreshCw, MoreVertical } from 'lucide-react'
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
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { getDxFeedErrorToastContent } from '@/lib/dxfeed-client-messages'
import { updateDxFeedDailySyncTimeAction } from './actions'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { DxFeedConnectForm } from './dxfeed-connect-form'

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
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false)
  const [dailySyncTime, setDailySyncTime] = useState<string>('')
  const [isSavingTime, setIsSavingTime] = useState(false)
  const [actionsMenuAccountId, setActionsMenuAccountId] = useState<string | null>(null)
  const t = useI18n()

  const closeActionsMenu = useCallback(() => {
    setActionsMenuAccountId(null)
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

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  const handleReloadAccounts = useCallback(async () => {
    try {
      setIsReloading(true)
      await loadAccounts()
      toast.success(t('dxfeedSync.multiAccount.accountsReloaded'))
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
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="h-8 flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 mr-2" />
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
            const isConnected = connection.hasToken && !connection.tokenExpired

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
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                            isConnected
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {isConnected
                            ? t('dxfeedSync.multiAccount.connected')
                            : t('dxfeedSync.multiAccount.expired')}
                        </span>
                      </div>
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={connection.accountId}
                      >
                        {connection.accountId}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
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
                                className="h-auto p-0 text-[11px] font-normal"
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
                              className="h-auto p-0 text-[11px] font-normal"
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
                          onClick={() => setIsAddDialogOpen(true)}
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
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
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
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    {t('dxfeedSync.multiAccount.syncImportsAllAccounts')}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dxfeedSync.addAccount.title')}</DialogTitle>
            <DialogDescription>{t('dxfeedSync.addAccount.description')}</DialogDescription>
          </DialogHeader>
          {isAddDialogOpen ? (
            <DxFeedConnectForm
              onConnected={() => setIsAddDialogOpen(false)}
              sourceUi="credentials_manager"
            />
          ) : null}
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
