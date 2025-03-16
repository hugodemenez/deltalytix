'use client'

import { useEffect, useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Clock } from 'lucide-react'

interface SyncCountdownProps {
  lastSyncTime: string | null
  isAutoSyncing: boolean
}

export function SyncCountdown({ lastSyncTime, isAutoSyncing }: SyncCountdownProps) {
  const [timeUntilSync, setTimeUntilSync] = useState<string>('')

  useEffect(() => {
    function updateCountdown() {
      if (!lastSyncTime) {
        setTimeUntilSync('Sync needed')
        return
      }

      const now = new Date().getTime()
      const lastSync = new Date(lastSyncTime).getTime()
      const hoursSinceLastSync = (now - lastSync) / (1000 * 60 * 60)
      
      if (isAutoSyncing) {
        setTimeUntilSync('Syncing...')
        return
      }

      if (hoursSinceLastSync >= 1) {
        setTimeUntilSync('Sync needed')
        return
      }

      const minutesUntilSync = 60 - (hoursSinceLastSync * 60)
      const minutes = Math.floor(minutesUntilSync)
      const seconds = Math.floor((minutesUntilSync - minutes) * 60)
      
      setTimeUntilSync(`${minutes}m ${seconds}s`)
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [lastSyncTime, isAutoSyncing])

  return (
    <Badge variant={isAutoSyncing ? "default" : "secondary"} className="ml-2">
      <Clock className="h-3 w-3 mr-1" />
      {timeUntilSync}
    </Badge>
  )
} 