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
}

interface AccountProgress {
  [accountId: string]: {
    ordersProcessed: number
    daysProcessed: number
    totalDays: number
    isComplete: boolean
    error?: string
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

export function RithmicSyncFeedback({ messages }: FeedbackProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [accountsProgress, setAccountsProgress] = useState<AccountProgress>({})
  const [currentAccount, setCurrentAccount] = useState<string | null>(null)
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalAccountsAvailable: 0,
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
    if (message.includes('Market Data Connection Login Complete') ||
        message.includes('Trading System Connection Login Complete')) {
      setConnectionStatus('connected')
    } else if (message.includes('Received')) {
      const numAccounts = parseInt(message.match(/Received (\d+) accounts/)?.[1] || '0')
      setProcessingStats(prev => ({
        ...prev,
        totalAccountsAvailable: numAccounts
      }))
    } else if (message.includes('Starting processing for account')) {
      const accountId = message.match(/account \d+ of \d+: ([^"]+)/)?.[1]
      if (accountId) {
        setCurrentAccount(accountId)
        setAccountsProgress(prev => ({
          ...prev,
          [accountId]: { 
            ordersProcessed: 0,
            daysProcessed: 0,
            totalDays: 0,
            isComplete: false
          }
        }))
      }
    } else if (message.includes('Completed processing account')) {
      const match = message.match(/account ([^,]+), collected (\d+) orders/)
      if (match) {
        const [, accountId, ordersCount] = match
        updateAccountProgress(accountId, parseInt(ordersCount), true)
      }
    }
  }, [updateAccountProgress])

  const handleCompleteMessage = useCallback((data: any) => {
    if (data.account_id) {
      updateAccountProgress(data.account_id, data.orders_count, true)
      if (data.account_number && data.total_accounts) {
        setProcessingStats(prev => ({
          ...prev,
          accountsProcessed: data.account_number,
          totalAccountsAvailable: data.total_accounts,
          isComplete: data.account_number === data.total_accounts
        }))
      }
    }
  }, [updateAccountProgress])

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
        }
      } catch (error) {
        console.error('Error parsing message:', error, msg)
      }
    })
  }, [messages, handleLogMessage, handleCompleteMessage, handleOrderMessage, handleProgressMessage, setDateRange])



  const overallProgress = processingStats.totalAccountsAvailable ? 
    (processingStats.accountsProcessed / processingStats.totalAccountsAvailable) * 100 : 0

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
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <motion.span 
                className="text-sm font-medium"
                key={processingStats.accountsProcessed}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {processingStats.accountsProcessed} of {processingStats.totalAccountsAvailable} accounts ({Math.round(overallProgress)}%)
              </motion.span>
            </div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <Progress value={overallProgress} className="w-full" />
            </motion.div>
          </div>

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
            <p>Total Orders Processed: {processingStats.totalOrders}</p>
            <AnimatePresence>
              {currentAccount && !processingStats.isComplete && (
                <motion.p {...fadeInOut}>
                  Currently Processing: {currentAccount}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
          
          <div>
            <motion.button
              className="flex items-center justify-between w-full text-sm font-medium mb-2"
              onClick={() => setShowDetails(!showDetails)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Accounts Status</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </motion.button>
            <AnimatePresence>
              {showDetails && (
                <motion.div {...slideDown}>
                  <ScrollArea className="h-[150px]">
                    <motion.div className="space-y-2">
                      {Object.entries(accountsProgress).map(([accountId, progress]) => (
                        <motion.div
                          key={accountId}
                          className="flex items-center justify-between"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{accountId}</p>
                            <div className="text-xs text-muted-foreground">
                              <p>Orders: {progress.ordersProcessed}</p>
                              {progress.totalDays > 0 && (
                                <p>Days: {progress.daysProcessed} / {progress.totalDays}</p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant={progress.isComplete ? "default" : "secondary"}
                            className="ml-2"
                          >
                            {progress.isComplete ? 'Complete' : 'Processing'}
                          </Badge>
                        </motion.div>
                      ))}
                    </motion.div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}

