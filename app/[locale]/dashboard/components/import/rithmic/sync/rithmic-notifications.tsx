'use client'

import { useEffect, useState, useRef } from 'react'
import { useRithmicSyncContext } from '@/context/rithmic-sync-context'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { XCircle, CheckCircle2, Info, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from "@/components/ui/progress"
import { useData } from '@/context/data-provider'
import { Button } from "@/components/ui/button"
import { useNotificationStore } from '@/store/notification'
import { useI18n } from '@/locales/client'

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

interface RithmicSyncNotificationsProps {
  isMockMode?: boolean
}

function formatYYYYMMDD(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr
  const year = dateStr.slice(0, 4)
  const month = dateStr.slice(4, 6)
  const day = dateStr.slice(6, 8)
  return `${day}/${month}/${year}`
}

export function RithmicSyncNotifications({ isMockMode = false }: RithmicSyncNotificationsProps) {
  const t = useI18n()
  const [notifications, setNotifications] = useState<Record<string, Notification>>({
    progress: {
      id: 'progress',
      type: 'info',
      title: t('notification.title'),
      message: t('notification.noAccount'),
      timestamp: Date.now(),
      progress: {
        current: 0,
        total: 0,
        ordersProcessed: 0
      }
    }
  })
  const [isComplete, setIsComplete] = useState(false)
  const { isCollapsed, setIsCollapsed } = useNotificationStore()
  const { lastMessage, isConnected, accountsProgress, currentAccount } = useRithmicSyncContext()
  const { refreshTrades } = useData()
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const mockIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Mock synchronization logic
  useEffect(() => {
    if (isMockMode) {
      let currentDay = 1
      const totalDays = 300
      let ordersProcessed = 0
      const mockAccount = 'MOCK-ACCOUNT-123'

      // Reset state
      setIsComplete(false)
      setNotifications(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          type: 'info',
          message: t('notification.processingAccount', { account: mockAccount }),
          timestamp: Date.now(),
          progress: {
            current: 0,
            total: totalDays,
            ordersProcessed: 0
          }
        }
      }))

      // Start mock progress
      mockIntervalRef.current = setInterval(() => {
        const currentDate = new Date()
        currentDate.setDate(currentDate.getDate() - (totalDays - currentDay))
        const formattedDate = currentDate.toISOString().slice(0, 10).replace(/-/g, '')

        ordersProcessed += Math.floor(Math.random() * 10) + 1

        setNotifications(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            type: 'info',
            message: t('notification.processingDate', { date: formatYYYYMMDD(formattedDate) }),
            timestamp: Date.now(),
            progress: {
              current: currentDay,
              total: totalDays,
              ordersProcessed,
              currentDate: formattedDate,
              currentDayNumber: currentDay
            }
          }
        }))

        currentDay++

        if (currentDay > totalDays) {
          clearInterval(mockIntervalRef.current)
          setIsComplete(true)
          setNotifications(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              type: 'success',
              message: t('notification.completed'),
              timestamp: Date.now()
            }
          }))
        }
      }, 2000) // Update every 2 seconds

      return () => {
        if (mockIntervalRef.current) {
          clearInterval(mockIntervalRef.current)
        }
      }
    }
  }, [isMockMode, t])

  // Reset complete state when connection is established
  useEffect(() => {
    if (isConnected && !isMockMode) {
      setIsComplete(false)
    }
  }, [isConnected, isMockMode])

  // Update progress notification when current account changes
  useEffect(() => {
    if (currentAccount && accountsProgress[currentAccount]) {
      const progress = accountsProgress[currentAccount]
      setNotifications(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          type: 'info',
          message: t('notification.processingAccount', { account: currentAccount }),
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
          message: t('notification.noAccount'),
          timestamp: Date.now(),
          progress: {
            current: 0,
            total: 0,
            ordersProcessed: 0
          }
        }
      }))
    }
  }, [currentAccount, accountsProgress, t])

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
              message: t('notification.completed'),
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
              message: t('notification.processingDate', { date: formatYYYYMMDD(date) }),
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
              message: t('notification.processingAccount', { account: accountId }),
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
  }, [lastMessage, refreshTrades, t])

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
              message: t('notification.noAccount'),
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
  }, [t])

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
  if (isComplete || notifications.progress.message === t('notification.noAccount')) {
    return null
  }

  const progress = notifications.progress.progress
  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      <Alert
        key={notifications.progress.id}
        className={cn(
          notifications.progress.type === 'success' && "border-green-500",
          isCollapsed && "w-16 h-16 p-0 ml-auto"
        )}
      >
        <div className={cn("flex items-start gap-2", isCollapsed && "justify-center items-center h-full")}>
          {isCollapsed ? (
            <div 
              className="relative w-12 h-12 cursor-pointer" 
              onClick={() => setIsCollapsed(false)}
              title={t('notification.expand')}
            >
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  className="text-muted-foreground/20"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="transparent"
                  r="20"
                  cx="24"
                  cy="24"
                />
                <circle
                  className="text-primary"
                  strokeWidth="2"
                  strokeDasharray={125.6}
                  strokeDashoffset={Math.max(0, 125.6 - (125.6 * (progressPercentage || 0)) / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="20"
                  cx="24"
                  cy="24"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          ) : (
            <>
              {notifications.progress.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {notifications.progress.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <AlertTitle>{t('notification.title')}</AlertTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setIsCollapsed(true)}
                      title={t('notification.collapse')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <AlertDescription>
                  <div>{notifications.progress.message}</div>
                  {progress && progress.total > 0 && (
                    <div className="mt-2 space-y-2">
                      <Progress 
                        value={progressPercentage} 
                        className="w-full h-2" 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('notification.days')}: {progress.current} / {progress.total}</span>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </>
          )}
        </div>
      </Alert>
    </div>
  )
} 