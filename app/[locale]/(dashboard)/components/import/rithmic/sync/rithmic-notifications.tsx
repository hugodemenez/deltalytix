'use client'

import { useEffect, useState, useRef } from 'react'
import { useWebSocket } from '@/components/context/rithmic-sync-context'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { XCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from "@/components/ui/progress"
import { useUserData } from '@/components/context/user-data'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message: string
  timestamp: number
  progress?: {
    current: number
    total: number
    ordersProcessed: number
    currentDate?: string
    currentDayNumber?: number
  }
}

export function WebSocketNotifications() {
  const [notifications, setNotifications] = useState<Record<string, Notification>>({
    progress: {
      id: 'progress',
      type: 'info',
      title: 'Current Progress',
      message: 'No account being processed',
      timestamp: Date.now(),
      progress: {
        current: 0,
        total: 0,
        ordersProcessed: 0
      }
    }
  })
  const [isComplete, setIsComplete] = useState(false)
  const { lastMessage, isConnected, accountsProgress, currentAccount } = useWebSocket()
  const { refreshTrades } = useUserData()
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()

  // Reset complete state when connection is established
  useEffect(() => {
    if (isConnected) {
      setIsComplete(false)
    }
  }, [isConnected])

  // Update progress notification when current account changes
  useEffect(() => {
    if (currentAccount && accountsProgress[currentAccount]) {
      const progress = accountsProgress[currentAccount]
      setNotifications(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          type: 'info',
          message: `Processing account ${currentAccount}`,
          timestamp: Date.now(),
          progress: {
            current: progress.daysProcessed,
            total: progress.totalDays,
            ordersProcessed: progress.ordersProcessed,
            currentDate: progress.currentDate,
            currentDayNumber: progress.currentDayNumber
          }
        }
      }))
    } else {
      setNotifications(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          message: 'No account being processed',
          timestamp: Date.now(),
          progress: {
            current: 0,
            total: 0,
            ordersProcessed: 0
          }
        }
      }))
    }
  }, [currentAccount, accountsProgress])

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'status' || lastMessage.type === 'processing_complete') {
        if (lastMessage.all_complete || lastMessage.type === 'processing_complete') {
          setIsComplete(true)
          setNotifications(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              type: 'success',
              message: 'Processing completed successfully',
              timestamp: Date.now()
            }
          }))
        }
      } else if (lastMessage.type === 'log' && lastMessage.level === 'info') {
        // Parse progress from processing date messages
        const processingMatch = lastMessage.message.match(/Processing date (\d+) of (\d+): (\d+)/)
        if (processingMatch) {
          const [_, current, total, date] = processingMatch
          setNotifications(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              type: 'info',
              message: `Processing data for ${date}`,
              timestamp: Date.now(),
              progress: {
                current: parseInt(current),
                total: parseInt(total),
                ordersProcessed: prev.progress.progress?.ordersProcessed || 0,
                currentDate: date,
                currentDayNumber: parseInt(current)
              }
            }
          }))
        }
      } else if (lastMessage.type === 'order_update') {
        // Update orders processed count
        setNotifications(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            timestamp: Date.now(),
            progress: {
              ...prev.progress.progress!,
              ordersProcessed: (prev.progress.progress?.ordersProcessed || 0) + 1,
              current: prev.progress.progress?.current || 0,
              total: prev.progress.progress?.total || 0
            }
          }
        }))
      } else if (lastMessage.type === 'progress') {
        const progressMatch = lastMessage.message.match(/\[(.*?)\] Processing date (\d+)\/(\d+)(?:: (\d{8}))?/)
        if (progressMatch) {
          const [, accountId, current, total, date] = progressMatch
          setNotifications(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              type: 'info',
              message: `Processing account ${accountId}`,
              timestamp: Date.now(),
              progress: {
                current: parseInt(current),
                total: parseInt(total),
                ordersProcessed: prev.progress.progress?.ordersProcessed || 0,
                currentDate: date,
                currentDayNumber: parseInt(current)
              }
            }
          }))
        }
      }
    }
  }, [lastMessage, refreshTrades])

  // Remove stale notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      setNotifications(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(key => {
          if (updated[key].timestamp < fiveMinutesAgo) {
            // Reset notifications to default state
            updated[key] = {
              ...updated[key],
              type: 'info',
              message: 'No account being processed',
              progress: {
                current: 0,
                total: 0,
                ordersProcessed: 0
              }
            }
          }
        })
        return updated
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Setup debounced refresh
  useEffect(() => {
    if (lastMessage?.type === 'complete') {
      console.log('Last message:', lastMessage)
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      // Set new timeout
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTrades()
      }, 5000)
    }

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [lastMessage, refreshTrades])

  // Don't render if process is complete or no active notifications
  if (isComplete || notifications.progress.message === 'No account being processed') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      <Alert
        key={notifications.progress.id}
        className={cn(
          "transition-all duration-300 hover:translate-x-[-5px]",
          notifications.progress.type === 'success' && "border-green-500"
        )}
      >
        <div className="flex items-start gap-2">
          {notifications.progress.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {notifications.progress.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
          <div className="space-y-1 w-full">
            <AlertTitle>{notifications.progress.title}</AlertTitle>
            <AlertDescription>
              <div>{notifications.progress.message}</div>
              {notifications.progress.progress && notifications.progress.progress.total > 0 && (
                <div className="mt-2 space-y-2">
                  <Progress 
                    value={(notifications.progress.progress.current / notifications.progress.progress.total) * 100} 
                    className="w-full h-2" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Days: {notifications.progress.progress.current} / {notifications.progress.progress.total}</span>
                    <span>Orders: {notifications.progress.progress.ordersProcessed}</span>
                  </div>
                  {notifications.progress.progress.currentDate && notifications.progress.progress.currentDayNumber && (
                    <div className="text-xs text-muted-foreground">
                      Processing day {notifications.progress.progress.currentDayNumber} - {notifications.progress.progress.currentDate}
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  )
} 