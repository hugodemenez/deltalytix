'use client'

import { useState, useCallback, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import {
  authenticateRithmicProtocol,
  listRithmicProtocolSystems,
} from './actions'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { RITHMIC_PROTOCOL_FALLBACK_SYSTEMS } from '@/lib/rithmic-protocol/systems'
import { captureConnectionCreated } from '@/lib/connection-analytics'

export function RithmicProtocolCredentialsManager() {
  const {
    performSyncForAccount,
    performSyncForAllAccounts,
    accounts,
    deleteAccount,
    loadAccounts,
  } = useRithmicProtocolSyncContext()

  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [systems, setSystems] = useState<string[]>([
    ...RITHMIC_PROTOCOL_FALLBACK_SYSTEMS,
  ])
  const [systemName, setSystemName] = useState<string>(
    RITHMIC_PROTOCOL_FALLBACK_SYSTEMS[0],
  )
  const [loadingSystems, setLoadingSystems] = useState(false)
  const [actionsMenuAccountId, setActionsMenuAccountId] = useState<string | null>(
    null,
  )
  const t = useI18n()

  useEffect(() => {
    if (!isAddDialogOpen) return
    let cancelled = false
    void (async () => {
      try {
        setLoadingSystems(true)
        const result = await listRithmicProtocolSystems()
        if (cancelled) return
        if (result.systems.length > 0) {
          setSystems(result.systems)
          setSystemName((current) =>
            result.systems.includes(current) ? current : result.systems[0],
          )
        }
      } catch (error) {
        console.warn('Failed to load Rithmic Protocol systems', error)
      } finally {
        if (!cancelled) setLoadingSystems(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAddDialogOpen])

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
    if (!username || !password || !systemName) {
      toast.error(t('rithmicProtocolSync.error.credentialsRequired'))
      return
    }

    try {
      setIsLoading(true)
      const result = await authenticateRithmicProtocol(
        username,
        password,
        systemName,
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
      await loadAccounts()
    } catch (error) {
      console.error('Rithmic Protocol connect error:', error)
      toast.error(t('rithmicProtocolSync.error.authFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [username, password, systemName, t, loadAccounts])

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
          disabled={accounts.length === 0}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
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
          {accounts.map((account) => (
            <AccordionItem key={account.accountId} value={account.accountId}>
              <AccordionTrigger className="text-sm">
                <div className="flex flex-col items-start gap-0.5 text-left">
                  <span className="font-medium">{account.accountId}</span>
                  <span className="text-xs text-muted-foreground">
                    {account.systemName || 'Rithmic'} ·{' '}
                    {account.accountNumbers.length}{' '}
                    {t('rithmicProtocolSync.multiAccount.accountsCount')}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={syncingId === account.accountId}
                    onClick={async () => {
                      setSyncingId(account.accountId)
                      await performSyncForAccount(account.accountId)
                      setSyncingId(null)
                    }}
                  >
                    {syncingId === account.accountId ? (
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
          ))}
        </Accordion>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rithmicProtocolSync.addAccount.title')}</DialogTitle>
            <DialogDescription>
              {t('rithmicProtocolSync.addAccount.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
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
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button
              onClick={() => void handleAddAccount()}
              disabled={isLoading || loadingSystems || !systemName}
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
