'use client'

import { useEffect, useState } from 'react'
import { useRithmicSyncStore } from '@/app/[locale]/dashboard/store/rithmic-sync-store'
import { Badge } from "@/components/ui/badge"
import { Clock } from 'lucide-react'

interface SyncCountdownProps {
  lastSyncTime: string
  isAutoSyncing: boolean
}

export function SyncCountdown({ lastSyncTime, isAutoSyncing }: SyncCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const { syncInterval } = useRithmicSyncStore()

  useEffect(() => {
    const calculateTimeLeft = () => {
      const lastSync = new Date(lastSyncTime)
      const now = new Date()
      const nextSync = new Date(lastSync.getTime() + syncInterval * 60 * 1000) // Convert minutes to milliseconds
      const diff = nextSync.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Ready')
        return
      }

      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${minutes}m ${seconds}s`)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [lastSyncTime, syncInterval])

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