'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, Plus, RefreshCw, MoreVertical, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { authenticateDxFeed, updateDxFeedDailySyncTimeAction } from './actions'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'

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
    if (!loginEmail || !loginPassword) {
      toast.error(t('dxfeedSync.error.credentialsRequired'))
      return
    }

    try {
      setIsLoading(true)
      const result = await authenticateDxFeed(loginEmail, loginPassword)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(t('dxfeedSync.connected'))
      setIsAddDialogOpen(false)
      setLoginEmail('')
      setLoginPassword('')
      await loadAccounts()
    } catch (error) {
      toast.error(t('dxfeedSync.error.authFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [loginEmail, loginPassword, t, loadAccounts])

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  const handleReloadAccounts = useCallback(async () => {
    try {
      setIsReloading(true)
      await loadAccounts()
      toast.success(t('dxfeedSync.multiAccount.accountsReloaded'))
    } catch (error) {
      toast.error(t('dxfeedSync.multiAccount.reloadError'))
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
        toast.error(result.error || t('dxfeedSync.multiAccount.dailySyncTimeUpdateError'))
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {t('dxfeedSync.multiAccount.savedAccounts')}
            </h2>
            <Button
              onClick={handleReloadAccounts}
              size="sm"
              variant="ghost"
              disabled={isReloading}
              className="h-8 w-8 p-0"
            >
              {isReloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={async () => {
                await performSyncForAllAccounts()
              }}
              size="sm"
              variant="outline"
              disabled={syncingId !== null}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('dxfeedSync.multiAccount.syncAll')}
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              disabled={isLoading}
              size="sm"
              className="h-8"
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
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dxfeedSync.multiAccount.accountName')}</TableHead>
              <TableHead>{t('dxfeedSync.multiAccount.lastSync')}</TableHead>
              <TableHead>{t('dxfeedSync.multiAccount.dailySyncTimeLocal')}</TableHead>
              <TableHead>{t('dxfeedSync.multiAccount.tokenStatus')}</TableHead>
              <TableHead>{t('dxfeedSync.multiAccount.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
                <TableRow key={account.accountId}>
                  <TableCell className="font-medium">
                    {account.accountNumbers.length > 0 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-left font-medium">
                            <span className="truncate max-w-[160px]">
                              {account.accountNumbers.length === 1
                                ? account.accountNumbers[0]
                                : `${account.accountNumbers.length} ${t('dxfeedSync.multiAccount.accountsCount')}`}
                            </span>
                            {account.accountNumbers.length > 1 && (
                              <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        {account.accountNumbers.length > 1 && (
                          <PopoverContent className="w-64 p-0" align="start">
                            <div className="px-3 py-2 border-b">
                              <p className="text-sm font-medium">{t('dxfeedSync.multiAccount.syncedAccounts')}</p>
                            </div>
                            <ScrollArea className="max-h-[200px]">
                              <div className="p-2 space-y-1">
                                {account.accountNumbers.map((num) => (
                                  <div
                                    key={num}
                                    className="px-2 py-1.5 text-sm rounded hover:bg-muted"
                                  >
                                    {num}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        )}
                      </Popover>
                    ) : (
                      <span className="text-muted-foreground text-sm">{account.accountId}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(account.lastSyncedAt.toISOString())}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleSetDailySyncTime(account.accountId, account.dailySyncTime)
                      }
                      className="text-xs"
                    >
                      {formatSyncTime(account.dailySyncTime)}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        account.hasToken
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {account.hasToken
                        ? t('dxfeedSync.multiAccount.valid')
                        : t('dxfeedSync.multiAccount.expired')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center items-center gap-2">
                      {!account.hasToken && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddDialogOpen(true)}
                          className="h-8"
                        >
                          {t('dxfeedSync.multiAccount.reconnect')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await performSyncForAccount(account.accountId)
                        }}
                        disabled={syncingId !== null || !account.hasToken}
                      >
                        {syncingId === account.accountId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="end">
                          <div className="flex flex-col space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedAccountId(account.accountId)
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
                  </TableCell>
                </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  {t('dxfeedSync.multiAccount.noSavedAccounts')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dxfeedSync.addAccount.title')}</DialogTitle>
            <DialogDescription>{t('dxfeedSync.addAccount.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
              <Button onClick={handleAddAccount} disabled={isLoading}>
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
