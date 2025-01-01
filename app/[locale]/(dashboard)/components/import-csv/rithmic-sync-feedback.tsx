'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { useWebSocket } from '../context/websocket-context'

interface FeedbackProps {
  totalAccounts: number
}

const fadeInOut = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
}

export function RithmicSyncFeedback({ totalAccounts }: FeedbackProps) {
  const { accountsProgress, currentAccount, processingStats, dateRange, connectionStatus } = useWebSocket()

  // Calculate progress for a specific account
  const getAccountProgress = (account: typeof accountsProgress[string]) => {
    if (account.isComplete) return 100
    if (!account.totalDays) return 0
    return (account.daysProcessed / account.totalDays) * 100
  }

  const getAccountStatus = (accountId: string, progress: typeof accountsProgress[string]) => {
    if (progress.isComplete) return { label: 'Complete', variant: 'default' as const }
    if (accountId === currentAccount) return { label: 'Processing', variant: 'secondary' as const }
    return { label: 'Idle', variant: 'outline' as const }
  }

  const getConnectionIcon = () => {
    if (connectionStatus.includes('Error')) {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }
    if (connectionStatus === 'Connected') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    }
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
  }

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
            {getConnectionIcon()}
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
                    {progress.currentDate && !progress.isComplete && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Processing day {progress.currentDayNumber} - {progress.currentDate}
                      </div>
                    )}
                    {progress.lastProcessedDate && (
                      <div className="text-xs text-green-500 mt-1">
                        Last processed: {progress.lastProcessedDate}
                      </div>
                    )}
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

