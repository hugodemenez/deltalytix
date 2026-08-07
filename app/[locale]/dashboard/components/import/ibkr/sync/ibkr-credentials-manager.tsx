'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertTriangle, Loader2, MoreVertical, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { useIbkrSyncContext } from '@/context/ibkr-sync-context'
import { updateIbkrDailySyncTimeAction } from './actions'
import { IbkrConnectForm } from './ibkr-connect-form'

export function IbkrCredentialsManager() {
  const { accounts, loadAccounts, deleteAccount, performSyncForAccount, performSyncForAllAccounts } =
    useIbkrSyncContext()
  const t = useI18n()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [actionsMenuAccountId, setActionsMenuAccountId] = useState<string | null>(null)

  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false)
  const [dailySyncTime, setDailySyncTime] = useState('')
  const [isSavingTime, setIsSavingTime] = useState(false)

  const handleRemove = useCallback(
    async (accountId: string) => {
      try {
        await deleteAccount(accountId)
        setIsRemoveDialogOpen(false)
        toast.success(t('ibkrSync.manage.connectionRemoved', { accountId }))
      } catch (error) {
        console.error('IBKR remove error:', error)
        toast.error(t('ibkrSync.manage.removeError', { accountId }))
      }
    },
    [deleteAccount, t],
  )

  const handleReload = useCallback(async () => {
    setIsReloading(true)
    try {
      await loadAccounts()
      toast.success(t('ibkrSync.manage.reloaded'))
    } finally {
      setIsReloading(false)
    }
  }, [loadAccounts, t])

  const handleSaveDailySyncTime = useCallback(async () => {
    if (!selectedAccountId) return
    setIsSavingTime(true)
    try {
      let utcTimeString: string | null = null
      if (dailySyncTime) {
        const [hours, minutes] = dailySyncTime.split(':').map(Number)
        const localDate = new Date()
        localDate.setHours(hours, minutes, 0, 0)
        utcTimeString = localDate.toISOString()
      }

      const result = await updateIbkrDailySyncTimeAction(selectedAccountId, utcTimeString)
      if (result.success) {
        toast.success(t('ibkrSync.manage.dailySyncTimeUpdated'))
        setIsTimeDialogOpen(false)
        await loadAccounts()
      } else {
        toast.error(t('ibkrSync.manage.dailySyncTimeUpdateError'))
      }
    } finally {
      setIsSavingTime(false)
    }
  }, [selectedAccountId, dailySyncTime, loadAccounts, t])

  function formatLocalTime(date: Date | null): string | null {
    if (!date) return null
    const local = new Date(date)
    return `${local.getHours().toString().padStart(2, '0')}:${local
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  }

  return (
    <div className="space-y-4 min-w-0 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold truncate">
            {t('ibkrSync.manage.savedConnections')}
          </h3>
          <Button
            onClick={handleReload}
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
          {accounts.length > 0 && (
            <Button
              onClick={() => performSyncForAllAccounts()}
              size="sm"
              variant="outline"
              disabled={syncingId !== null}
              className="h-8 flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="truncate">{t('ibkrSync.manage.syncAll')}</span>
            </Button>
          )}
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="h-8 flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('ibkrSync.manage.addNew')}
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="border rounded-lg px-4 py-8 text-center text-muted-foreground text-sm">
          {t('ibkrSync.manage.noConnections')}
        </div>
      ) : (
        <ul className="rounded-lg border divide-y">
          {accounts.map((connection) => {
            const isConnected = connection.hasToken && !connection.tokenExpired
            return (
              <li key={connection.accountId} className="flex min-w-0 items-start gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {t('ibkrSync.manage.queryLabel', { queryId: connection.accountId })}
                    </p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                        isConnected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {isConnected
                        ? t('ibkrSync.manage.connected')
                        : t('ibkrSync.manage.expired')}
                    </span>
                  </div>
                  {connection.accountNumbers.length > 0 && (
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {connection.accountNumbers.join(', ')}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>
                      {t('ibkrSync.manage.lastSync')}:{' '}
                      <span className="text-foreground/75">
                        {connection.lastSyncedAt.toLocaleString()}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {t('ibkrSync.manage.dailySync')}:
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-[11px] font-normal"
                        onClick={() => {
                          setSelectedAccountId(connection.accountId)
                          setDailySyncTime(formatLocalTime(connection.dailySyncTime) ?? '')
                          setIsTimeDialogOpen(true)
                        }}
                      >
                        {formatLocalTime(connection.dailySyncTime) ??
                          t('ibkrSync.manage.scheduleSync')}
                      </Button>
                    </span>
                  </div>
                  {connection.currencies.length > 1 && (
                    <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-500">
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {t('ibkrSync.manage.multiCurrency', {
                        currencies: connection.currencies.join(', '),
                      })}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {!isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddDialogOpen(true)}
                      className="h-7 px-2 text-xs"
                    >
                      {t('ibkrSync.manage.reconnect')}
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
                    title={t('ibkrSync.manage.syncNow')}
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
                          setActionsMenuAccountId(null)
                          setSelectedAccountId(connection.accountId)
                          setIsRemoveDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('ibkrSync.manage.removeConnection')}
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('ibkrSync.connect.title')}</DialogTitle>
            <DialogDescription>{t('ibkrSync.connect.description')}</DialogDescription>
          </DialogHeader>
          <IbkrConnectForm onConnected={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ibkrSync.manage.removeConnection')}</DialogTitle>
            <DialogDescription>
              {t('ibkrSync.manage.removeConfirm', { accountId: selectedAccountId ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedAccountId && handleRemove(selectedAccountId)}
            >
              {t('ibkrSync.manage.remove')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ibkrSync.manage.dailySyncTimeTitle')}</DialogTitle>
            <DialogDescription>
              {t('ibkrSync.manage.dailySyncTimeDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ibkr-sync-time">{t('ibkrSync.manage.dailySyncTimeLabel')}</Label>
              <Input
                id="ibkr-sync-time"
                type="time"
                value={dailySyncTime}
                onChange={(e) => setDailySyncTime(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t('ibkrSync.manage.dailySyncTimeTimezoneNote', {
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
