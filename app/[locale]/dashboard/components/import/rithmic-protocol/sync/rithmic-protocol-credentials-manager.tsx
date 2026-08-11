'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  MoreVertical,
} from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { authenticateRithmicProtocol } from './actions'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import { useRithmicProtocolConnectOptions } from './use-rithmic-protocol-connect-options'

export function RithmicProtocolCredentialsManager() {
  const {
    performSyncForAccount,
    performSyncForAllAccounts,
    isAutoSyncing,
    isAccountSyncing,
    accounts,
    deleteAccount,
    loadAccounts,
  } = useRithmicProtocolSyncContext()

  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [historyStartDate, setHistoryStartDate] = useState('')
  const {
    gateways,
    gatewayId,
    setGatewayId,
    systems,
    systemName,
    setSystemName,
    loadingGateways,
    loadingSystems,
  } = useRithmicProtocolConnectOptions(isAddDialogOpen)
  const [actionsMenuAccountId, setActionsMenuAccountId] = useState<string | null>(
    null,
  )
  const t = useI18n()
  const todayUtc = new Date().toISOString().slice(0, 10)

  const handleRemoveConnection = useCallback(
    async (accountId: string) => {
      try {
        await deleteAccount(accountId)
        setIsRemoveDialogOpen(false)
        toast.success(
          t('rithmicProtocolSync.multiAccount.connectionRemoved', { accountId }),
        )
      } catch (error) {
        toast.error(
          t('rithmicProtocolSync.multiAccount.removeError', { accountId }),
        )
        console.error('Remove connection error:', error)
      }
    },
    [t, deleteAccount],
  )

  const handleAddAccount = useCallback(async () => {
    if (!username || !password || !systemName || !historyStartDate) {
      toast.error(t('rithmicProtocolSync.error.credentialsRequired'))
      return
    }

    const connectedUsername = username
    try {
      setIsLoading(true)
      const result = await authenticateRithmicProtocol(
        username,
        password,
        systemName,
        historyStartDate,
        gatewayId,
      )

      if ('error' in result && result.error) {
        const translate = t as (
          key: string,
          params?: Record<string, string | number>,
        ) => string
        toast.error(
          translate(`rithmicProtocolSync.errors.${result.error}`, {
            reason: String(result.errorParams?.reason ?? ''),
          }),
        )
        return
      }

      toast.success(t('rithmicProtocolSync.connected'))
      captureConnectionCreated('rithmic-protocol')
      setIsAddDialogOpen(false)
      setUsername('')
      setPassword('')
      setShowPassword(false)
      setHistoryStartDate('')
      await loadAccounts()
      // One sync pulls every trading account stored on this connection.
      void performSyncForAccount(connectedUsername)
    } catch (error) {
      console.error('Rithmic Protocol connect error:', error)
      toast.error(t('rithmicProtocolSync.error.authFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [
    username,
    password,
    systemName,
    historyStartDate,
    gatewayId,
    t,
    loadAccounts,
    performSyncForAccount,
  ])

  const handleReloadAccounts = useCallback(async () => {
    try {
      setIsReloading(true)
      await loadAccounts()
      toast.success(t('rithmicProtocolSync.multiAccount.accountsReloaded'))
    } catch (error) {
      toast.error(t('rithmicProtocolSync.multiAccount.reloadError'))
      console.error('Reload error:', error)
    } finally {
      setIsReloading(false)
    }
  }, [loadAccounts, t])

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t('rithmicProtocolSync.addAccount.connect')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void performSyncForAllAccounts()}
          disabled={accounts.length === 0 || isAutoSyncing}
        >
          {isAutoSyncing ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {t('rithmicProtocolSync.multiAccount.syncAll')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleReloadAccounts()}
          disabled={isReloading}
        >
          {isReloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('rithmicProtocolSync.multiAccount.empty')}
        </p>
      ) : (
        <Accordion type="multiple" className="w-full">
          {accounts.map((account) => {
            const syncing = isAccountSyncing(account.accountId)
            return (
            <AccordionItem key={account.accountId} value={account.accountId}>
              <AccordionTrigger className="text-sm">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <div className="flex min-w-0 flex-col items-start gap-0.5">
                    <span className="font-medium">{account.accountId}</span>
                    <span className="text-xs text-muted-foreground">
                      {account.systemName || 'Rithmic'}
                      {account.gatewayLabel ? ` · ${account.gatewayLabel}` : ''} ·{' '}
                      {account.accountNumbers.length}{' '}
                      {t('rithmicProtocolSync.multiAccount.accountsCount')}
                    </span>
                  </div>
                  {syncing ? (
                    <Loader2
                      className="ml-auto h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                      aria-label={t('rithmicProtocolSync.sync.inProgress', {
                        accountId: account.accountId,
                      })}
                    />
                  ) : null}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={syncing}
                    onClick={() => {
                      void performSyncForAccount(account.accountId)
                    }}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    {t('rithmicProtocolSync.multiAccount.syncNow')}
                  </Button>
                  <Popover
                    open={actionsMenuAccountId === account.accountId}
                    onOpenChange={(open) =>
                      setActionsMenuAccountId(open ? account.accountId : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-destructive"
                        onClick={() => {
                          setSelectedAccountId(account.accountId)
                          setIsRemoveDialogOpen(true)
                          setActionsMenuAccountId(null)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('rithmicProtocolSync.multiAccount.remove')}
                      </Button>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground w-full">
                    {t('rithmicProtocolSync.multiAccount.lastSynced')}:{' '}
                    {new Date(account.lastSyncedAt).toLocaleString()}
                  </p>
                  {account.accountNumbers.length > 0 && (
                    <p className="text-xs text-muted-foreground w-full">
                      {account.accountNumbers.join(', ')}
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            )
          })}
        </Accordion>
      )}

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) setShowPassword(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rithmicProtocolSync.addAccount.title')}</DialogTitle>
            <DialogDescription>
              {t('rithmicProtocolSync.addAccount.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('rithmicProtocolSync.addAccount.gatewayLabel')}</Label>
              <Select
                value={gatewayId}
                onValueChange={setGatewayId}
                disabled={loadingGateways || gateways.length === 0}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gateways.map((gateway) => (
                    <SelectItem key={gateway.id} value={gateway.id}>
                      {gateway.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('rithmicProtocolSync.addAccount.gatewayHelp')}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('rithmicProtocolSync.addAccount.systemLabel')}</Label>
              <Select
                value={systemName}
                onValueChange={setSystemName}
                disabled={loadingSystems || systems.length === 0}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('rithmicProtocolSync.addAccount.usernameLabel')}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('rithmicProtocolSync.addAccount.passwordLabel')}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? t('rithmicProtocolSync.addAccount.hidePassword')
                      : t('rithmicProtocolSync.addAccount.showPassword')
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                {t('rithmicProtocolSync.addAccount.historyStartLabel')}
              </Label>
              <Input
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
                min="2013-01-01"
                max={todayUtc}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('rithmicProtocolSync.addAccount.historyStartHelp')}
              </p>
            </div>
            <Button
              onClick={() => void handleAddAccount()}
              disabled={
                isLoading ||
                loadingGateways ||
                loadingSystems ||
                !systemName ||
                !username ||
                !password ||
                !historyStartDate
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('rithmicProtocolSync.addAccount.connecting')}
                </>
              ) : (
                t('rithmicProtocolSync.addAccount.connect')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('rithmicProtocolSync.multiAccount.removeTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('rithmicProtocolSync.multiAccount.removeDescription', {
                accountId: selectedAccountId || '',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedAccountId && void handleRemoveConnection(selectedAccountId)
              }
            >
              {t('rithmicProtocolSync.multiAccount.remove')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
