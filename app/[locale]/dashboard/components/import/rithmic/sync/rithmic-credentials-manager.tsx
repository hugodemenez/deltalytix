'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Plus, Edit2, RefreshCw, MoreVertical, History } from 'lucide-react'
import { getAllRithmicData, clearRithmicData, RithmicCredentialSet, updateLastSyncTime } from '@/lib/rithmic-storage'
import { useUserData } from '@/components/context/user-data'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { SyncCountdown } from './sync-countdown'
import { useWebSocket } from '@/components/context/rithmic-sync-context'
import { useI18n } from '@/locales/client'
import { toast } from "sonner"
import { useRithmicSyncStore, SyncInterval } from '@/app/[locale]/dashboard/store/rithmic-sync-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface RithmicCredentialsManagerProps {
  onSelectCredential: (credential: RithmicCredentialSet) => void
  onAddNew: () => void
}

export function RithmicCredentialsManager({ onSelectCredential, onAddNew }: RithmicCredentialsManagerProps) {
  const [credentials, setCredentials] = useState<Record<string, RithmicCredentialSet>>(getAllRithmicData())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null)
  const { isAutoSyncing, performAutoSyncForCredential, connect, getWebSocketUrl, authenticateAndGetAccounts } = useWebSocket()
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [cooldownId, setCooldownId] = useState<string | null>(null)
  const syncTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  const t = useI18n()
  const { user } = useUserData()
  const { syncInterval, setSyncInterval } = useRithmicSyncStore()

  const handleSync = useCallback(async (credential: RithmicCredentialSet) => {
    // Prevent multiple syncs for the same credential
    if (syncingId === credential.id || cooldownId === credential.id) {
      return
    }

    try {
      setSyncingId(credential.id)
      const result = await performAutoSyncForCredential(credential.id)
      
      if (result?.success) {
        updateLastSyncTime(credential.id)
      }
      
      // Clear any existing timeout for this credential
      if (syncTimeoutsRef.current[credential.id]) {
        clearTimeout(syncTimeoutsRef.current[credential.id])
      }

      // Set cooldown
      setCooldownId(credential.id)
      syncTimeoutsRef.current[credential.id] = setTimeout(() => {
        setCooldownId(null)
        delete syncTimeoutsRef.current[credential.id]
      }, 5000)

    } catch (error) {
      toast.error(t('rithmic.error.syncError'))
      console.error('Sync error:', error)
    } finally {
      setSyncingId(null)
    }
  }, [syncingId, cooldownId, performAutoSyncForCredential, t])

  const handleLoadMoreData = useCallback(async (credential: RithmicCredentialSet) => {
    if (syncingId === credential.id || cooldownId === credential.id) {
      return
    }

    try {
      setSyncingId(credential.id)
      
      // Authenticate and get accounts
      const authResult = await authenticateAndGetAccounts({
        ...credential.credentials,
        userId: user?.id || ''
      })

      if (!authResult.success) {
        if (authResult.rateLimited) {
          toast.error(t('rithmic.error.rateLimit'))
        } else {
          toast.error(t('rithmic.error.authError'))
        }
        return
      }

      // Calculate start date (300 days ago)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 300)
      const formattedStartDate = startDate.toISOString().slice(0, 10).replace(/-/g, '')

      // Get accounts to sync
      const accountsToSync = credential.allAccounts 
        ? authResult.accounts.map(acc => acc.account_id)
        : credential.selectedAccounts

      // Connect and start syncing with the new date range
      const wsUrl = getWebSocketUrl(authResult.websocket_url)
      connect(wsUrl, authResult.token, accountsToSync, formattedStartDate)

      // Update last sync time
      updateLastSyncTime(credential.id)

      // Set cooldown
      setCooldownId(credential.id)
      syncTimeoutsRef.current[credential.id] = setTimeout(() => {
        setCooldownId(null)
        delete syncTimeoutsRef.current[credential.id]
      }, 5000)

    } catch (error) {
      toast.error(t('rithmic.error.syncError'))
      console.error('Load more data error:', error)
    } finally {
      setSyncingId(null)
    }
  }, [syncingId, cooldownId, authenticateAndGetAccounts, connect, getWebSocketUrl, t, user?.id])

  // Cleanup timeouts on unmount
  useEffect(() => {
    // Capture current value to use in cleanup function
    const timeouts = syncTimeoutsRef.current
    
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  function handleDelete(id: string) {
    clearRithmicData(id)
    setCredentials(getAllRithmicData())
    setIsDeleteDialogOpen(false)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('rithmic.savedCredentials')}</h2>
          <Button onClick={onAddNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('rithmic.addNew')}
          </Button>
        </div>
        
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('rithmic.syncInterval')}</span>
              <Select
                value={syncInterval.toString()}
                onValueChange={(value) => setSyncInterval(parseInt(value) as SyncInterval)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={() => {
              const allCredentials = Object.values(credentials)
              allCredentials.forEach(cred => handleSync(cred))
            }} 
            size="sm"
            variant="outline"
            disabled={true}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('rithmic.actions.syncAll')}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('rithmic.username')}</TableHead>
              <TableHead>{t('rithmic.lastSync')}</TableHead>
              <TableHead>{t('rithmic.nextSync')}</TableHead>
              <TableHead>{t('rithmic.actions.title')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(credentials).map(([id, cred]) => (
              <TableRow key={id}>
                <TableCell>{cred.credentials.username}</TableCell>
                <TableCell>{formatDate(cred.lastSyncTime)}</TableCell>
                <TableCell>
                  <SyncCountdown 
                    lastSyncTime={cred.lastSyncTime} 
                    isAutoSyncing={isAutoSyncing && syncingId === id} 
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSync(cred)}
                      disabled={isAutoSyncing || cooldownId === id}
                    >
                      {syncingId === id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : cooldownId === id ? (
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
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
                            className="justify-start"
                            onClick={() => handleLoadMoreData(cred)}
                            disabled={isAutoSyncing || cooldownId === id}
                          >
                            {syncingId === id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <History className="h-4 w-4 mr-2" />
                            )}
                            {t('rithmic.actions.loadMore')}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="justify-start"
                            onClick={() => onSelectCredential(cred)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            {t('rithmic.actions.edit')}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedCredentialId(id)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('rithmic.actions.delete')}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {Object.keys(credentials).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  {t('rithmic.noSavedCredentials')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rithmic.deleteCredentials')}</DialogTitle>
            <DialogDescription>
              {t('rithmic.deleteCredentialsConfirm')}
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
              onClick={() => selectedCredentialId && handleDelete(selectedCredentialId)}
            >
              {t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
