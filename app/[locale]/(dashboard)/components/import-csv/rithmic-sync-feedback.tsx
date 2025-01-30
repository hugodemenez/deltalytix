'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { useWebSocket } from '../context/websocket-context'
import { cn } from "@/lib/utils"
import { useI18n } from '@/locales/client'

interface RithmicSyncFeedbackProps {
  totalAccounts: number
}

const fadeInOut = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
}

export function RithmicSyncFeedback({ totalAccounts }: RithmicSyncFeedbackProps) {
  const { 
    accountsProgress, 
    currentAccount, 
    processingStats, 
    dateRange, 
    connectionStatus,
    messageHistory
  } = useWebSocket()
  const t = useI18n()

  // Calculate progress for a specific account
  const getAccountProgress = (accountId: string, account: typeof accountsProgress[string]) => {
    if (!account) return 0
    if (account.isComplete) return 100
    if (account.total > 0) {
      // Ensure progress never decreases by using max with previous value
      const progress = Math.max(0, Math.min(100, (account.current / account.total) * 100))
      return Math.floor(progress) // Use floor to avoid floating point issues
    }
    return 0
  }

  const getAccountStatus = (accountId: string, progress: typeof accountsProgress[string]) => {
    if (!progress) return { label: t('rithmic.sync.status.pending'), variant: 'outline' as const }
    if (progress.isComplete) return { label: t('rithmic.sync.status.complete'), variant: 'default' as const }
    if (accountId === currentAccount && progress.current > 0) return { label: t('rithmic.sync.status.processing'), variant: 'secondary' as const }
    return { label: t('rithmic.sync.status.queued'), variant: 'outline' as const }
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

  const getLatestMessage = (accountId: string) => {
    // Filter and get the latest valid message for the account
    const validMessages = messageHistory
      .filter(msg => {
        if (typeof msg === 'string') {
          try {
            msg = JSON.parse(msg)
          } catch {
            return false
          }
        }
        const message = typeof msg === 'string' ? JSON.parse(msg).message : msg.message
        
        // Only show important messages, not progress updates
        return message?.includes(`[${accountId}]`) && 
               !message?.includes('undefined') && 
               !message?.includes('NaN') &&
               !message?.includes('Processing date') && // Filter out progress messages
               (
                 message?.includes('Successfully processed orders') ||
                 message?.includes('Completed processing account') ||
                 message?.includes('Starting processing for account') ||
                 message?.includes('error') ||
                 message?.includes('Error')
               )
      })
      .map(msg => typeof msg === 'string' ? JSON.parse(msg) : msg)
      
    return validMessages[validMessages.length - 1]
  }

  return (
    <Card className="w-full mx-auto overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t('rithmic.sync.title')}
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
          <div className="flex items-center justify-between text-sm">
            <span>{t('rithmic.sync.totalAccounts')}: {totalAccounts}</span>
            <span>{t('rithmic.sync.processed')}: {processingStats.accountsProcessed}</span>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <motion.div className="space-y-4">
              {Object.entries(accountsProgress).map(([accountId, progress]) => {
                const latestMessage = getLatestMessage(accountId)
                const progressValue = getAccountProgress(accountId, progress)
                
                return (
                  <motion.div
                    key={accountId}
                    className="flex flex-col gap-2 p-4 rounded-lg border"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
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
                    
                    <Progress 
                      value={progressValue}
                      className="w-full h-2" 
                    />
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>{t('rithmic.sync.days')}: {progress?.current || 0} / {progress?.total || 0}</div>
                    </div>

                    {progress?.currentDate && progress.current > 0 && !progress.isComplete && (
                      <div className="text-xs text-muted-foreground">
                        {t('rithmic.sync.processing')}: {progress.currentDate}
                      </div>
                    )}

                    {latestMessage && (
                      <div className={cn(
                        "text-xs mt-1 truncate",
                        latestMessage.message?.toLowerCase().includes('error') ? 
                          "text-red-500" : 
                          "text-muted-foreground"
                      )}>
                        {latestMessage.message}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          </ScrollArea>
        </motion.div>
      </CardContent>
    </Card>
  )
}

