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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { getDxFeedErrorToastContent } from '@/lib/dxfeed-client-messages'
import { showToastWithCopy } from '@/lib/toast-copy'
import { authenticateDxFeed, updateDxFeedDailySyncTimeAction } from './actions'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { getEnabledDxFeedPropFirms } from '@/lib/dxfeed-propfirms'

const DXFEED_PROP_FIRM_OPTIONS = getEnabledDxFeedPropFirms()
const DEFAULT_PROP_FIRM_ID = DXFEED_PROP_FIRM_OPTIONS[0]?.id ?? ''

export function DxFeedCredentialsManager() {
  const {
    performSyncForAccount,
    performSyncForAllAccounts,
    accounts,
    deleteAccount,
    loadAccounts,
  } = useDxFeedSyncContext()

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
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
  const t = useI18n()

  const handleDelete = useCallback(
    async (accountId: string) => {
      try {
        await deleteAccount(accountId)
        setIsDeleteDialogOpen(false)
        toast.success(t('dxfeedSync.multiAccount.accountDeleted', { accountId }))
      } catch (error) {
        toast.error(t('dxfeedSync.multiAccount.deleteError', { accountId }))
        console.error('Delete error:', error)
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
      const result = await authenticateDxFeed(loginEmail, loginPassword, selectedPropFirmId)

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
      setIsAddDialogOpen(false)
      setLoginEmail('')
      setLoginPassword('')
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
  }, [loginEmail, loginPassword, selectedPropFirmId, t, loadAccounts])

  const selectedPropFirm = DXFEED_PROP_FIRM_OPTIONS.find((f) => f.id === selectedPropFirmId)

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

  function formatSyncTime(date: Date | null) {
    if (!date) return t('dxfeedSync.multiAccount.dailySyncTimeNotSet')

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
        <Accordion type="multiple" className="border rounded-lg divide-y">
          {accounts.map((connection) => {
            const tradingAccountCount = connection.accountNumbers.length

            return (
              <AccordionItem
                key={connection.accountId}
                value={connection.accountId}
                className="border-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-stretch min-w-0">
                  <AccordionTrigger className="flex-1 px-3 py-3 sm:px-4 sm:py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180 min-w-0">
                    <div className="flex w-full min-w-0 flex-col gap-3 text-left pr-1 sm:pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {t('dxfeedSync.multiAccount.tradingAccountsCount', {
                            count: tradingAccountCount,
                          })}
                        </Badge>
                        <span
                          className={`px-2 py-0.5 rounded text-xs shrink-0 ${
                            connection.hasToken && !connection.tokenExpired
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {connection.hasToken && !connection.tokenExpired
                            ? t('dxfeedSync.multiAccount.valid')
                            : t('dxfeedSync.multiAccount.expired')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 min-w-0">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t('dxfeedSync.multiAccount.propFirm')}
                          </p>
                          <p className="text-base font-semibold break-words">
                            {connection.propFirmName ?? '—'}
                          </p>
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t('dxfeedSync.multiAccount.connection')}
                          </p>
                          <p
                            className="text-sm break-all text-foreground/90"
                            title={connection.accountId}
                          >
                            {connection.accountId}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('dxfeedSync.multiAccount.lastSync')}:{' '}
                        <span className="text-foreground/80">
                          {formatDate(connection.lastSyncedAt.toISOString())}
                        </span>
                      </p>
                    </div>
                  </AccordionTrigger>
                  <div
                    className="flex items-center justify-end gap-1 px-3 py-2 sm:py-0 border-t sm:border-t-0 sm:border-l shrink-0 bg-muted/20 sm:bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {(!connection.hasToken || connection.tokenExpired) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddDialogOpen(true)}
                        className="h-8 text-xs sm:text-sm"
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
                      disabled={
                        syncingId !== null ||
                        !connection.hasToken ||
                        !!connection.tokenExpired
                      }
                      className="h-8 w-8 p-0 shrink-0"
                      title={t('dxfeedSync.multiAccount.syncAll')}
                    >
                      {syncingId === connection.accountId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-52 p-2" align="end">
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() =>
                              handleSetDailySyncTime(
                                connection.accountId,
                                connection.dailySyncTime,
                              )
                            }
                          >
                            {formatSyncTime(connection.dailySyncTime)}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedAccountId(connection.accountId)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('dxfeedSync.multiAccount.delete')}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                    <p className="text-sm font-medium">
                      {t('dxfeedSync.multiAccount.tradingAccountsList')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('dxfeedSync.multiAccount.syncImportsAllAccounts')}
                    </p>
                    {tradingAccountCount > 0 ? (
                      <ul className="space-y-1">
                        {connection.accountNumbers.map((name) => (
                          <li
                            key={name}
                            className="text-sm font-mono px-2 py-1.5 rounded bg-background border"
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('dxfeedSync.multiAccount.noTradingAccounts')}
                      </p>
                    )}
                  </div>
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
              <Select value={selectedPropFirmId} onValueChange={setSelectedPropFirmId}>
                <SelectTrigger id="dxfeed-prop-firm">
                  <SelectValue placeholder={t('dxfeedSync.addAccount.propFirmPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {DXFEED_PROP_FIRM_OPTIONS.map((firm) => (
                    <SelectItem key={firm.id} value={firm.id}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('dxfeedSync.addAccount.propFirmHint')}
                {selectedPropFirm?.website ? (
                  <>
                    {' '}
                    <a
                      href={selectedPropFirm.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {selectedPropFirm.website.replace(/^https?:\/\//, '')}
                    </a>
                  </>
                ) : null}
              </p>
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
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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
                  t('dxfeedSync.addAccount.connect')
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dxfeedSync.multiAccount.deleteAccount')}</DialogTitle>
            <DialogDescription>
              {t('dxfeedSync.multiAccount.deleteAccountConfirm', {
                accountId: selectedAccountId,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedAccountId && handleDelete(selectedAccountId)}
            >
              {t('common.delete')}
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
