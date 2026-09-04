'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { useIbkrSyncContext } from '@/context/ibkr-sync-context'
import { useIgSyncContext } from '@/context/ig-sync-context'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { useRithmicSyncContext } from '@/context/rithmic-sync-context'
import { useTradovateSyncContext } from '@/context/tradovate-sync-context'
import {
  canSyncStripItem,
  type StripItem,
} from './connections-strip-items'

/**
 * Reuses the same broker sync contexts and handlers as
 * `/dashboard/connections`. Does not invent a new backend.
 */
export function useStripConnectionSync(item: StripItem, onSynced: () => void) {
  const t = useI18n()
  const [localSyncing, setLocalSyncing] = useState(false)
  const { performSyncForAccount: syncTradovate } = useTradovateSyncContext()
  const { performSyncForAccount: syncDxFeed } = useDxFeedSyncContext()
  const { performSyncForAccount: syncIbkr } = useIbkrSyncContext()
  const { performSyncForCredential: syncRithmic } = useRithmicSyncContext()
  const {
    performSyncForAccount: syncRithmicProtocol,
    isAccountSyncing: isRithmicProtocolSyncing,
  } = useRithmicProtocolSyncContext()
  const { performSyncForAccount: syncIg, isAccountSyncing: isIgSyncing } =
    useIgSyncContext()

  const canSync = canSyncStripItem(item) && Boolean(item.accountId)
  const contextSyncing =
    item.kind === 'connection' &&
    ((item.service === 'rithmic-protocol' &&
      isRithmicProtocolSyncing(item.accountId)) ||
      (item.service === 'ig' && isIgSyncing(item.accountId)))
  const syncing = localSyncing || contextSyncing

  const sync = useCallback(async () => {
    if (!canSync || !item.accountId || syncing) return

    const usesLocalSyncState =
      item.service !== 'rithmic-protocol' && item.service !== 'ig'
    if (usesLocalSyncState) setLocalSyncing(true)

    try {
      let result: { success?: boolean } | void
      if (item.service === 'tradovate') {
        result = await syncTradovate(item.accountId)
      } else if (item.service === 'dxfeed') {
        result = await syncDxFeed(item.accountId)
      } else if (item.service === 'ibkr') {
        result = await syncIbkr(item.accountId)
      } else if (item.service === 'rithmic-protocol') {
        result = await syncRithmicProtocol(item.accountId)
      } else if (item.service === 'ig') {
        result = await syncIg(item.accountId)
      } else if (item.service === 'rithmic') {
        result = await syncRithmic(item.accountId)
      } else {
        toast.message(t('connections.sync.manualOnly'))
        return
      }

      if (result && result.success === false) {
        if (usesLocalSyncState) {
          toast.error(t('connections.sync.failed'))
        }
        return
      }

      onSynced()
    } catch (error) {
      console.error(error)
      if (usesLocalSyncState) {
        toast.error(t('connections.sync.failed'))
      }
    } finally {
      if (usesLocalSyncState) setLocalSyncing(false)
    }
  }, [
    canSync,
    item.accountId,
    item.service,
    onSynced,
    syncDxFeed,
    syncIbkr,
    syncIg,
    syncRithmic,
    syncRithmicProtocol,
    syncTradovate,
    syncing,
    t,
  ])

  return { canSync, sync, syncing }
}
