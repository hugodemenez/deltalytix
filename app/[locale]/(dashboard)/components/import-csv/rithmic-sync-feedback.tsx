'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CheckCircle2, AlertCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface FeedbackProps {
  messages: string[]
  totalAccounts: number
}

interface AccountProgress {
  [accountId: string]: {
    ordersProcessed: number
    daysProcessed: number
    totalDays: number
    isComplete: boolean
    error?: string
    currentDate?: string
    processedDates?: string[]
  }
}

interface ProcessingStats {
  totalAccountsAvailable: number
  accountsProcessed: number
  totalOrders: number
  isComplete: boolean
}

const fadeInOut = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
}

const slideDown = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.3 }
}

export function RithmicSyncFeedback({ messages, totalAccounts }: FeedbackProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [accountsProgress, setAccountsProgress] = useState<AccountProgress>({})
  const [currentAccount, setCurrentAccount] = useState<string | null>(null)
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalAccountsAvailable: totalAccounts,
    accountsProcessed: 0,
    totalOrders: 0,
    isComplete: false
  })
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const updateAccountProgress = useCallback((accountId: string, ordersCount: number, isComplete: boolean) => {
    setAccountsProgress(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        ordersProcessed: prev[accountId]?.ordersProcessed + ordersCount,
        isComplete
      }
    }))
    setProcessingStats(prev => ({
      ...prev,
      accountsProcessed: isComplete ? prev.accountsProcessed + 1 : prev.accountsProcessed,
      totalOrders: prev.totalOrders + ordersCount
    }))
  },[])

  const handleLogMessage = useCallback((message: string) => {
    if (message.includes('WebSocket Connection Established')) {
      setConnectionStatus('connected')
    } else if (message.includes('Market Data Connection Login Complete') ||
              message.includes('Trading System Connection Login Complete')) {
      setConnectionStatus('connected')
    } else if (message.includes('Processing date')) {
      const match = message.match(/Processing date (\d+) of (\d+): (\d{8})/)
      if (match) {
        const [, currentDay, totalDays, date] = match
        if (currentAccount) {
          setAccountsProgress(prev => ({
            ...prev,
            [currentAccount]: {
              ...prev[currentAccount],
              daysProcessed: parseInt(currentDay),
              totalDays: parseInt(totalDays),
              currentDate: date
            }
          }))
        }
      }
    } else if (message.includes('Successfully processed orders for date')) {
      const date = message.match(/date (\d{8})/)?.[1]
      if (date && currentAccount) {
        setAccountsProgress(prev => ({
          ...prev,
          [currentAccount]: {
            ...prev[currentAccount],
            processedDates: [...(prev[currentAccount]?.processedDates || []), date]
          }
        }))
      }
    } else if (message.includes('Successfully added account')) {
      const accountId = message.match(/account ([^"]+)/)?.[1]
      if (accountId) {
        setAccountsProgress(prev => ({
          ...prev,
          [accountId]: {
            ordersProcessed: 0,
            daysProcessed: 0,
            totalDays: 0,
            isComplete: false,
            processedDates: []
          }
        }))
      }
    } else if (message.includes('Starting processing for account')) {
      const accountId = message.match(/account \d+ of \d+: ([^"]+)/)?.[1]
      if (accountId) {
        setCurrentAccount(accountId)
      }
    } else if (message.includes('Completed processing account') && message.includes('collected')) {
      const match = message.match(/account ([^,]+), collected (\d+) orders/)
      if (match) {
        const [, accountId, ordersStr] = match
        const ordersCount = parseInt(ordersStr, 10)
        setAccountsProgress(prev => ({
          ...prev,
          [accountId]: {
            ...prev[accountId],
            ordersProcessed: ordersCount,
            isComplete: true
          }
        }))
        setProcessingStats(prev => ({
          ...prev,
          accountsProcessed: prev.accountsProcessed + 1,
          totalOrders: prev.totalOrders + ordersCount
        }))
      }
    }
  }, [currentAccount])

  const handleCompleteMessage = useCallback((data: any) => {
    const accountId = data.account_id
    const ordersCount = data.orders_count || 0

    if (accountId) {
      setAccountsProgress(prev => {
        const newProgress = {
          ...prev,
          [accountId]: {
            ...prev[accountId],
            ordersProcessed: ordersCount,
            isComplete: true
          }
        }
        
        function isAccountProgress(acc: unknown): acc is AccountProgress[string] {
          return acc !== null && 
                 typeof acc === 'object' && 
                 'isComplete' in acc && 
                 typeof (acc as any).isComplete === 'boolean'
        }
        
        const completedAccounts = Object.values(newProgress)
          .filter(isAccountProgress)
          .filter(acc => acc.isComplete)
          .length
        
        setProcessingStats(prevStats => ({
          ...prevStats,
          accountsProcessed: completedAccounts,
          totalOrders: prevStats.totalOrders + ordersCount,
          isComplete: completedAccounts === prevStats.totalAccountsAvailable
        }))

        return newProgress
      })
    }
  }, [])

  const handleOrderMessage = useCallback((data: any) => {
    if (data.account_id) {
      updateAccountProgress(data.account_id, 1, false)
    }
  }, [updateAccountProgress])

  const handleProgressMessage = useCallback((data: any) => {
    if (data.account_id) {
      setAccountsProgress(prev => ({
        ...prev,
        [data.account_id]: {
          ...prev[data.account_id],
          ordersProcessed: data.orders_processed,
          daysProcessed: data.days_processed,
          totalDays: data.total_days
        }
      }))
    }
  }, [])
  useEffect(() => {
    messages.forEach(msg => {
      try {
        const data = JSON.parse(typeof msg === 'string' ? msg : JSON.stringify(msg))

        switch (data.type) {
          case 'init':
            if (data.token) {
              // Handle initial connection with token
              setConnectionStatus('connected')
            }
            break
          case 'log':
            handleLogMessage(data.message)
            break
          case 'complete':
            handleCompleteMessage(data)
            break
          case 'order':
            handleOrderMessage(data)
            break
          case 'progress':
            handleProgressMessage(data)
            break
          case 'date_range':
            setDateRange({ start: data.start_date, end: data.end_date })
            break
          case 'init_stats':
            setProcessingStats(prev => ({
              ...prev,
              totalAccountsAvailable: data.total_accounts,
              accountsProcessed: 0,
              totalOrders: 0,
              isComplete: false
            }))
            break
          case 'status':
            if (data.all_complete) {
              setProcessingStats(prev => ({
                ...prev,
                isComplete: true,
                totalOrders: data.total_orders || prev.totalOrders
              }))
            }
            break
        }
      } catch (error) {
        console.error('Error parsing message:', error, msg)
      }
    })
  }, [messages, handleLogMessage, handleCompleteMessage, handleOrderMessage, handleProgressMessage])

  const overallProgress = processingStats.totalAccountsAvailable ? 
    (processingStats.accountsProcessed / processingStats.totalAccountsAvailable) * 100 : 0

  // Calculate progress for a specific account
  const getAccountProgress = useCallback((account: AccountProgress[string]) => {
    if (account.isComplete) return 100
    if (!account.totalDays) return 0
    return (account.daysProcessed / account.totalDays) * 100
  }, [])

  const getAccountStatus = useCallback((accountId: string, progress: AccountProgress[string]) => {
    if (progress.isComplete) return { label: 'Complete', variant: 'default' as const }
    if (accountId === currentAccount) return { label: 'Processing', variant: 'secondary' as const }
    return { label: 'Idle', variant: 'outline' as const }
  }, [currentAccount])

  return (
    <Card className="w-full mx-auto overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Connection Status
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {connectionStatus === 'connecting' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            {connectionStatus === 'connected' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {connectionStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
          </motion.div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div className="space-y-4" layout>
          <AnimatePresence>
            {dateRange && (
              <motion.div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                {...fadeInOut}
              >
                <Calendar className="h-4 w-4" />
                <span>Processing orders from {dateRange.start} to {dateRange.end}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            className="text-sm space-y-1"
            {...fadeInOut}
          >
            <div className="flex justify-between">
              <p>Total Orders: {processingStats.totalOrders}</p>
              {currentAccount && !processingStats.isComplete && (
                <p>Currently Processing: {currentAccount}</p>
              )}
            </div>
          </motion.div>
          
          <ScrollArea className="h-[300px]">
            <motion.div className="space-y-3">
              {Object.entries(accountsProgress).map(([accountId, progress]) => (
                <motion.div
                  key={accountId}
                  className="flex flex-col gap-2 p-3 rounded-lg border"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{accountId}</p>
                    <Badge 
                      variant={getAccountStatus(accountId, progress).variant}
                      className="ml-2"
                    >
                      {getAccountStatus(accountId, progress).label}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Progress 
                      value={progress.isComplete ? 100 : accountId === currentAccount ? getAccountProgress(progress) : 0} 
                      className="w-full h-2" 
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Days: {progress.daysProcessed} / {progress.totalDays}</span>
                      <span>Orders: {progress.ordersProcessed}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </ScrollArea>
        </motion.div>
      </CardContent>
    </Card>
  )
}

