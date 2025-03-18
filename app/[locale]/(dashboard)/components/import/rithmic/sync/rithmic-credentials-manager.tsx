'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Plus, Edit2, RefreshCw } from 'lucide-react'
import { getAllRithmicData, clearRithmicData, RithmicCredentialSet } from '@/lib/rithmic-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

interface RithmicCredentialsManagerProps {
  onSelectCredential: (credential: RithmicCredentialSet) => void
  onAddNew: () => void
}

export function RithmicCredentialsManager({ onSelectCredential, onAddNew }: RithmicCredentialsManagerProps) {
  const [credentials, setCredentials] = useState<Record<string, RithmicCredentialSet>>(getAllRithmicData())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null)
  const { isAutoSyncing, performAutoSyncForCredential } = useWebSocket()
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [cooldownId, setCooldownId] = useState<string | null>(null)
  const syncTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  const t = useI18n()

  const handleSync = useCallback(async (credential: RithmicCredentialSet) => {
    // Prevent multiple syncs for the same credential
    if (syncingId === credential.id || cooldownId === credential.id) {
      return
    }

    try {
      setSyncingId(credential.id)
      await performAutoSyncForCredential(credential.id)
      
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(syncTimeoutsRef.current).forEach(timeout => clearTimeout(timeout))
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
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('rithmic.savedCredentials')}</h2>
        <Button onClick={onAddNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('rithmic.addNew')}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('rithmic.username')}</TableHead>
              <TableHead>{t('rithmic.lastSync')}</TableHead>
              <TableHead>{t('rithmic.nextSync')}</TableHead>
              <TableHead>{t('rithmic.actions')}</TableHead>
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
                  <div className="flex space-x-2">
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onSelectCredential(cred)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedCredentialId(id)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
