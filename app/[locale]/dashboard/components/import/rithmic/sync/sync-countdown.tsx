'use client'

import { useEffect, useState, useRef } from 'react'
import { useRithmicSyncStore } from '@/store/rithmic-sync-store'

import { useSyncContext } from '@/context/sync-context'

import { Badge } from "@/components/ui/badge"
import { Clock } from 'lucide-react'

interface SyncCountdownProps {
  lastSyncTime: string
  isAutoSyncing: boolean
  credentialId?: string
}

export function SyncCountdown({ lastSyncTime, isAutoSyncing, credentialId }: SyncCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const { syncInterval } = useRithmicSyncStore()

  const { rithmic } = useSyncContext()
  const { performSyncForCredential } = rithmic

  const hasTriggeredSyncRef = useRef(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const lastSync = new Date(lastSyncTime)
      const now = new Date()
      const nextSync = new Date(lastSync.getTime() + syncInterval * 60 * 1000) // Convert minutes to milliseconds
      const diff = nextSync.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Ready')
        
        // Trigger immediate sync check when ready (only once per ready state)
        if (!hasTriggeredSyncRef.current && credentialId && !isAutoSyncing) {
          hasTriggeredSyncRef.current = true
          console.log('Countdown reached Ready state, triggering immediate sync check for credential:', credentialId)

          performSyncForCredential(credentialId).catch(error => {

            console.error('Error triggering immediate sync:', error)
          })
        }
        return
      }

      // Reset the trigger flag when we're not in ready state
      if (hasTriggeredSyncRef.current) {
        hasTriggeredSyncRef.current = false
      }

      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${minutes}m ${seconds}s`)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)

  }, [lastSyncTime, syncInterval, credentialId, isAutoSyncing, performSyncForCredential])


  if (isAutoSyncing) {
    return <span className="text-primary">Syncing...</span>
  }

  return (
    <Badge variant={isAutoSyncing ? "default" : "secondary"} className="ml-2">
      <Clock className="h-3 w-3 mr-1" />
      {timeLeft}
    </Badge>
  )
} 