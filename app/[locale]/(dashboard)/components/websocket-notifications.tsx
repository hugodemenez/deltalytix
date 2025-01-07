'use client'

import { useEffect, useState, useRef } from 'react'
import { useWebSocket } from './context/websocket-context'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { XCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from "@/components/ui/progress"
import { useTrades } from '@/components/context/trades-data'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message: string
  timestamp: number
  count?: number
  details?: string[]
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
    },
    error: {
      id: 'error',
      type: 'error',
      title: 'Errors',
      message: 'No errors',
      timestamp: Date.now(),
      count: 0,
      details: []
    }
  })
  const [isComplete, setIsComplete] = useState(false)
  const { lastMessage, isConnected, accountsProgress, currentAccount } = useWebSocket()
  const { refreshTrades } = useTrades()
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
      if (lastMessage.type === 'status') {
        if (lastMessage.all_complete) {
          setIsComplete(true)
        } else if (lastMessage.level === 'info' && lastMessage.message === 'Process completed successfully') {
          // Set complete flag and hide notifications after delay
          setTimeout(() => {
            setIsComplete(true)
          }, 5000)
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
      } else if (lastMessage.type === 'error') {
        setNotifications(prev => ({
          ...prev,
          error: {
            ...prev.error,
            message: lastMessage.message,
            count: (prev.error.count || 0) + 1,
            timestamp: Date.now(),
            details: [...(prev.error.details || []), lastMessage.message].slice(-5)
          }
        }))
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
            // Reset notifications to default state instead of removing them
            updated[key] = {
              ...updated[key],
              type: 'info',
              message: key === 'progress' ? 'No account being processed' : 'No errors',
              count: 0,
              details: []
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
  if (isComplete || !Object.values(notifications).some(notification => 
    notification.message !== 'No errors' &&
    notification.message !== 'No account being processed'
  )) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {Object.values(notifications)
        .filter(notification => 
          notification.message !== 'No errors' &&
          notification.message !== 'No account being processed'
        )
        .map(notification => (
          <Alert
            key={notification.id}
            className={cn(
              "transition-all duration-300 hover:translate-x-[-5px]",
              notification.type === 'error' && "border-destructive",
              notification.type === 'success' && "border-green-500",
            )}
          >
            <div className="flex items-start gap-2">
              {notification.type === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
              {notification.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {notification.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
              <div className="space-y-1 w-full">
                <AlertTitle className="flex justify-between">
                  {notification.title}
                  {notification.count ? <span className="text-sm text-muted-foreground">({notification.count})</span> : null}
                </AlertTitle>
                <AlertDescription>
                  <div>{notification.message}</div>
                  {notification.progress && notification.progress.total > 0 && (
                    <div className="mt-2 space-y-2">
                      <Progress 
                        value={(notification.progress.current / notification.progress.total) * 100} 
                        className="w-full h-2" 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Days: {notification.progress.current} / {notification.progress.total}</span>
                        <span>Orders: {notification.progress.ordersProcessed}</span>
                      </div>
                      {notification.progress.currentDate && notification.progress.currentDayNumber && (
                        <div className="text-xs text-muted-foreground">
                          Processing day {notification.progress.currentDayNumber} - {notification.progress.currentDate}
                        </div>
                      )}
                    </div>
                  )}
                  {notification.details && notification.details.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {notification.details.map((detail, i) => (
                        <div key={i} className="truncate">{detail}</div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
    </div>
  )
} 