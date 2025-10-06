'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Plus, RefreshCw, MoreVertical } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from '@/locales/client'
import { toast } from "sonner"
import { getAllTradovateTokens, storeTradovateToken, getTradovateTrades, initiateTradovateOAuth, removeTradovateToken } from './actions'
import { useTradovateSyncStore } from '@/store/tradovate-sync-store'
import { useData } from '@/context/data-provider'

interface TradovateAccount {
  accountId: string
  token: string
  tokenExpiresAt: string
  lastSyncedAt: string
  isExpired: boolean
  environment: 'demo' | 'live'
}

export function TradovateCredentialsManager() {
  const [accounts, setAccounts] = useState<TradovateAccount[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const t = useI18n()
  const tradovateStore = useTradovateSyncStore()
  const { refreshTrades } = useData()

  // Load accounts from database
  const loadAccounts = useCallback(async () => {
    try {
      const result = await getAllTradovateTokens()
      if (!result.error && result.tokens) {
        const accountsData = result.tokens
          .filter(token => token.token) // Only include tokens that have a valid token
          .map(token => ({
            accountId: token.accountId,
            token: token.token!,
            tokenExpiresAt: token.tokenExpiresAt?.toISOString() || new Date().toISOString(),
            lastSyncedAt: token.lastSyncedAt?.toISOString() || new Date().toISOString(),
            isExpired: token.isExpired || false,
            environment: 'demo' as 'demo' | 'live' // Default to demo since we don't store environment in the current schema
          }))
        setAccounts(accountsData)
      }
    } catch (error) {
      console.warn('Failed to load Tradovate accounts:', error)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const handleSync = useCallback(async (account: TradovateAccount) => {
    // Prevent multiple syncs for the same account
    if (syncingId === account.accountId) {
      return
    }

    try {
      console.log('Starting sync for account:', account.accountId)
      setSyncingId(account.accountId)
      
      const result = await getTradovateTrades(account.token)

      // Handle duplicate trades (already imported)
      if (result.error === "DUPLICATE_TRADES") {
        toast.error(t('tradovateSync.multiAccount.alreadyImportedTrades'))
        await refreshTrades()
        return
      }
      
      if (result.error) {
        toast.error(t('tradovateSync.multiAccount.syncErrorForAccount', { 
          accountId: account.accountId, 
          error: result.error 
        }))
        return
      }

      // Track progress
      const savedCount = result.savedCount || 0
      const ordersCount = result.ordersCount || 0
      
      console.log(`Sync complete for ${account.accountId}: ${savedCount} trades saved, ${ordersCount} orders processed`)

      // Show success message
      if (savedCount > 0) {
        toast.success(t('tradovateSync.multiAccount.syncCompleteForAccount', { 
          savedCount, 
          ordersCount, 
          accountId: account.accountId 
        }))
      } else if (ordersCount > 0) {
        toast.info(t('tradovateSync.multiAccount.syncCompleteNoNewTradesForAccount', { 
          ordersCount, 
          accountId: account.accountId 
        }))
      } else {
        toast.info(t('tradovateSync.multiAccount.syncCompleteNoOrdersForAccount', { 
          accountId: account.accountId 
        }))
      }

      // Refresh the accounts list to update last sync time
      await loadAccounts()
      await refreshTrades()

    } catch (error) {
      toast.error(t('tradovateSync.multiAccount.syncErrorForAccount', { 
        accountId: account.accountId, 
        error: error instanceof Error ? error.message : t('tradovateSync.sync.unknownError')
      }))
      console.error('Sync error:', error)
    } finally {
      setSyncingId(null)
    }
  }, [syncingId, t, loadAccounts, refreshTrades])

  const handleDelete = useCallback(async (accountId: string) => {
    try {
      // For now, we'll just remove from local state
      // In the future, we might want to add a deleteTradovateToken server action
      setAccounts(prev => prev.filter(acc => acc.accountId !== accountId))
      await removeTradovateToken(accountId)
      setIsDeleteDialogOpen(false)
      toast.success(t('tradovateSync.multiAccount.accountDeleted', { accountId }))
    } catch (error) {
      toast.error(t('tradovateSync.multiAccount.deleteError', { accountId }))
      console.error('Delete error:', error)
    }
  }, [t])


  const handleStartOAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await initiateTradovateOAuth('default') // We'll determine the actual account ID from the token
      if (result.error || !result.authUrl || !result.state) {
        toast.error(t('tradovateSync.error.oauthInit'))
        return
      }
      
      // Store the state for verification
      tradovateStore.setOAuthState(result.state)
      
      // Also store in sessionStorage as backup
      sessionStorage.setItem('tradovate_oauth_state', result.state)
      
      // Redirect to Tradovate OAuth
      window.location.href = result.authUrl
    } catch (error) {
      toast.error(t('tradovateSync.error.oauthInit'))
    } finally {
      setIsLoading(false)
    }
  }, [t, tradovateStore])

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  function getNextSyncTime(lastSyncTime: string): string {
    // For now, return a placeholder - in the future we could implement auto-sync intervals
    return t('tradovateSync.multiAccount.manualSync')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('tradovateSync.multiAccount.savedAccounts')}</h2>
          <div className="flex gap-2 items-center">
            <Button 
              onClick={() => {
                accounts.forEach(account => handleSync(account))
              }} 
              size="sm"
              variant="outline"
              disabled={syncingId !== null}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('tradovateSync.multiAccount.syncAll')}
            </Button>
            <Button 
              onClick={handleStartOAuth} 
              disabled={isLoading} 
              size="sm"
              className="h-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('tradovateSync.multiAccount.addNew')}
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tradovateSync.multiAccount.accountName')}</TableHead>
              <TableHead>{t('tradovateSync.multiAccount.environment')}</TableHead>
              <TableHead>{t('tradovateSync.multiAccount.lastSync')}</TableHead>
              <TableHead>{t('tradovateSync.multiAccount.tokenStatus')}</TableHead>
              <TableHead>{t('tradovateSync.multiAccount.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.accountId}>
                <TableCell className="font-medium">{account.accountId}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    account.environment === 'live' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {account.environment}
                  </span>
                </TableCell>
                <TableCell>{formatDate(account.lastSyncedAt)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    account.isExpired 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {account.isExpired ? t('tradovateSync.multiAccount.expired') : t('tradovateSync.multiAccount.valid')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSync(account)}
                      disabled={syncingId !== null || account.isExpired}
                    >
                      {syncingId === account.accountId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
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
                            {t('tradovateSync.multiAccount.delete')}
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
                  {t('tradovateSync.multiAccount.noSavedAccounts')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tradovateSync.multiAccount.deleteAccount')}</DialogTitle>
            <DialogDescription>
              {t('tradovateSync.multiAccount.deleteAccountConfirm', { accountId: selectedAccountId })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
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
    </div>
  )
}
