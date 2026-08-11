'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
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
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { RithmicProtocolConnectForm } from './rithmic-protocol-connect-form'

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
  const [isReloading, setIsReloading] = useState(false)
  const [actionsMenuAccountId, setActionsMenuAccountId] = useState<string | null>(
    null,
  )
  const t = useI18n()

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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rithmicProtocolSync.addAccount.title')}</DialogTitle>
            <DialogDescription>
              {t('rithmicProtocolSync.addAccount.description')}
            </DialogDescription>
          </DialogHeader>
          {isAddDialogOpen ? (
            <RithmicProtocolConnectForm
              onConnected={() => setIsAddDialogOpen(false)}
            />
          ) : null}
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
