'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { getRithmicData, getAllRithmicData, updateLastSyncTime, clearRithmicData, saveRithmicData, RithmicCredentialSet } from '@/lib/rithmic-storage'
import { useData } from '@/context/data-provider'
import { toast } from "@/hooks/use-toast"
import { useI18n } from "@/locales/client"
import { useRithmicSyncStore, SyncInterval } from '@/store/rithmic-sync-store'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { getRithmicSynchronizations } from '@/app/[locale]/dashboard/components/import/rithmic/sync/actions'
import { getUserId } from '@/server/auth'

interface AccountProgress {
  ordersProcessed: number
  daysProcessed: number
  totalDays: number
  isComplete: boolean
  error?: string
  currentDate?: string
  processedDates?: string[]
  currentDayNumber?: number
  lastProcessedDate?: string
  current: number
  total: number
}

interface ProcessingStats {
  totalAccountsAvailable: number
  accountsProcessed: number
  isComplete: boolean
}

interface RithmicCredentials {
  username: string
  password: string
  server_type: string
  location: string
  userId: string
}

function parseRateLimitMessage(detail: string) {
  const match = detail.match(/Maximum (\d+) attempts allowed per (\d+\.?\d*) minutes\. Please wait (\d+\.?\d*) minutes/)
  return match
    ? { max: match[1], period: match[2], wait: match[3] }
    : { max: 2, period: 15, wait: 12 }
}

interface RithmicSyncContextType {
  // Core connection management
  connect: (url: string, token: string, accounts: string[], startDate: string) => void
  disconnect: () => void
  isConnected: boolean
  connectionStatus: string
  
  // Message handling
  lastMessage: any
  messageHistory: any[]
  handleMessage: (message: any) => void
  
  // Progress tracking
  accountsProgress: Record<string, AccountProgress>
  currentAccount: string | null
  processingStats: ProcessingStats
  
  // Account management
  selectedAccounts: string[]
  availableAccounts: { account_id: string; fcm_id: string }[]
  setSelectedAccounts: (accounts: string[]) => void
  setAvailableAccounts: (accounts: { account_id: string; fcm_id: string }[]) => void
  
  // State management
  resetProcessingState: () => void
  step: 'credentials' | 'select-accounts' | 'processing'
  setStep: (step: 'credentials' | 'select-accounts' | 'processing') => void
  showAccountComparisonDialog: boolean
  setShowAccountComparisonDialog: (show: boolean) => void
  
  // Auto-sync functionality
  isAutoSyncing: boolean
  performSyncForCredential: (credentialId: string) => Promise<{ success: boolean; rateLimited: boolean; message: string } | undefined>
  
  // Utilities
  calculateStartDate: (selectedAccounts: string[]) => string
  authenticateAndGetAccounts: (credentials: RithmicCredentials) => Promise<
    | { success: false; rateLimited: boolean; message: string }
    | { success: true; rateLimited: boolean; token: string; websocket_url: string; accounts: { account_id: string; fcm_id: string }[] }
  >
  getWebSocketUrl: (baseUrl: string) => string
}

const RithmicSyncContext = createContext<RithmicSyncContextType | undefined>(undefined)

export function RithmicSyncContextProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [accountsProgress, setAccountsProgress] = useState<Record<string, AccountProgress>>({})
  const [currentAccount, setCurrentAccount] = useState<string | null>(null)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [availableAccounts, setAvailableAccounts] = useState<{ account_id: string; fcm_id: string }[]>([])
  const [messageHistory, setMessageHistory] = useState<any[]>([])
  const { refreshTrades } = useData()
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalAccountsAvailable: 0,
    accountsProcessed: 0,
    isComplete: false
  })
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const [step, setStep] = useState<'credentials' | 'select-accounts' | 'processing'>('credentials')
  const [showAccountComparisonDialog, setShowAccountComparisonDialog] = useState(false)

  const [activityTimeout, setActivityTimeout] = useState<NodeJS.Timeout | null>(null)
  const [syncCheckInterval, setSyncCheckInterval] = useState<NodeJS.Timeout | null>(null)

  const t = useI18n()
  const { syncInterval } = useRithmicSyncStore()
  const trades = useTradesStore((state) => state.trades)


  const resetProcessingState = useCallback(() => {
    setProcessingStats({
      totalAccountsAvailable: 0,
      accountsProcessed: 0,
      isComplete: false
    })
    setAccountsProgress({})
    setCurrentAccount(null)
  }, [])

  const disconnect = useCallback(() => {
    if (ws) {
      console.log('Disconnecting WebSocket')
      ws.close()
      setWs(null)
      setIsConnected(false)
      setConnectionStatus('Disconnected')
      resetProcessingState()
    }
    // Clear activity timeout when disconnecting
    if (activityTimeout) {
      clearTimeout(activityTimeout)
      setActivityTimeout(null)
    }
    // Clear sync check interval when disconnecting
    if (syncCheckInterval) {
      clearInterval(syncCheckInterval)
      setSyncCheckInterval(null)
    }
  }, [ws, resetProcessingState, activityTimeout, syncCheckInterval])

  const handleMessage = useCallback((message: any) => {
    if (!message) return

    setLastMessage(message)

    // Add message to history
    setMessageHistory(prev => [...prev, message])

    switch (message.type) {
      case 'log':
        if (message.level === 'info') {
          // Handle initial days count message
          if (message.message.includes('Processing') && message.message.includes('days of history')) {
            const match = message.message.match(/Processing (\d+) days of history from \d{8}/)
            if (match) {
              const [, totalDays] = match

              // Look for the most recently added account that doesn't have totalDays set
              setAccountsProgress(prev => {
                const entries = Object.entries(prev)
                const activeAccount = entries.find(([_, progress]) =>
                  !progress.isComplete && progress.totalDays === 0
                )

                if (!activeAccount) {
                  console.warn('No matching account found for setting total days:', {
                    totalDays,
                    message: message.message
                  })
                  return prev
                }

                const [accountId] = activeAccount
                console.log('Setting total days:', { accountId, totalDays })

                return {
                  ...prev,
                  [accountId]: {
                    ...prev[accountId],
                    totalDays: parseInt(totalDays),
                    daysProcessed: 0,
                    total: parseInt(totalDays) // Also update the total field
                  }
                }
              })
            }
          }
          // Handle day-by-day progress
          else if (message.message.includes('Processing date')) {
            // Support both old and new message formats
            const newFormatMatch = message.message.match(/\[(.*?)\] Processing date (\d+)\/(\d+)(?:: (\d{8}))?/)
            const oldFormatMatch = message.message.match(/Processing date (\d+) of (\d+)(?:: (\d{8}))?/)

            let accountId: string | undefined
            let currentDay: string | undefined
            let totalDays: string | undefined
            let currentDate: string | undefined = undefined

            if (newFormatMatch) {
              [, accountId, currentDay, totalDays, currentDate] = newFormatMatch
            } else if (oldFormatMatch) {
              [, currentDay, totalDays, currentDate] = oldFormatMatch
              accountId = currentAccount || message.account_id
            }

            if (accountId && currentDay && totalDays) {
              setAccountsProgress(prev => {

                // Calculate the actual days processed based on the current day number
                const daysProcessed = Math.max(parseInt(currentDay) - 1, 0)

                return {
                  ...prev,
                  [accountId]: {
                    ...prev[accountId],
                    currentDayNumber: parseInt(currentDay),
                    totalDays: parseInt(totalDays),
                    currentDate: currentDate || '',
                    daysProcessed: daysProcessed,
                    processedDates: prev[accountId]?.processedDates || [],
                    current: parseInt(currentDay),
                    total: parseInt(totalDays)
                  }
                }
              })
            }
          }
          // Handle completed dates
          else if (message.message.includes('Successfully processed orders for date')) {
            const date = message.message.match(/date (\d{8})/)?.[1]
            const accountId = currentAccount || message.account_id
            if (date && accountId) {
              setAccountsProgress(prev => {
                const currentProgress = prev[accountId] || {
                  ordersProcessed: 0,
                  daysProcessed: 0,
                  totalDays: 0,
                  isComplete: false,
                  processedDates: [],
                  currentDayNumber: 0,
                  currentDate: '',
                  lastProcessedDate: ''
                }

                const newDaysProcessed = currentProgress.daysProcessed + 1

                return {
                  ...prev,
                  [accountId]: {
                    ...currentProgress,
                    processedDates: [...(currentProgress.processedDates || []), date],
                    lastProcessedDate: date,
                    daysProcessed: newDaysProcessed
                  }
                }
              })
            }
          }
          // Handle account initialization
          else if (message.message.includes('Successfully added account')) {
            const accountId = message.message.match(/account ([^"]+)/)?.[1]
            if (accountId) {
              setAccountsProgress(prev => ({
                ...prev,
                [accountId]: {
                  ordersProcessed: 0,
                  daysProcessed: 0,
                  totalDays: 0,
                  isComplete: false,
                  processedDates: [],
                  currentDayNumber: 0,
                  currentDate: '',
                  lastProcessedDate: '',
                  current: 0,
                  total: 0
                }
              }))
            }
          }
          // Handle account start
          else if (message.message.includes('Starting processing for account')) {
            const accountMatch = message.message.match(/account \d+ of \d+: ([^"\s]+)/)
            const accountId = accountMatch?.[1]
            if (accountId) {
              setCurrentAccount(accountId)

              setAccountsProgress(prev => ({
                ...prev,
                [accountId]: {
                  ...prev[accountId],
                  ordersProcessed: 0,
                  daysProcessed: 0,
                  isComplete: false,
                  processedDates: [],
                  currentDayNumber: 0,
                  currentDate: '',
                  lastProcessedDate: ''
                }
              }))
            }
          }
          // Handle account completion
          else if (message.message.includes('Completed processing account') && message.message.includes('collected')) {
            const match = message.message.match(/account ([^,]+), collected (\d+) orders/)
            if (match) {
              const [, accountId, ordersStr] = match
              const ordersCount = parseInt(ordersStr, 10)
              setAccountsProgress(prev => ({
                ...prev,
                [accountId]: {
                  ...prev[accountId],
                  ordersProcessed: ordersCount,
                  isComplete: true,
                  daysProcessed: prev[accountId]?.totalDays || 0,
                  currentDayNumber: prev[accountId]?.totalDays || 0
                }
              }))
            }
          }
        }
        break

      case 'order_update':
        if (message.account_id) {
          setAccountsProgress(prev => {
            const prevAccount = prev[message.account_id]
            if (!prevAccount) return prev

            return {
              ...prev,
              [message.account_id]: {
                ...prevAccount,
                ordersProcessed: prevAccount.ordersProcessed + 1
              }
            }
          })
        }
        break

      case 'processing_complete':
        refreshTrades()
        break

      case 'status':
        if (message.all_complete) {
        }
        break

      case 'progress':
        const progressMatch = message.message.match(/\[(.*?)\] Processing date (\d+)\/(\d+)(?:: (\d{8}))?/)
        if (progressMatch) {
          const [, accountId, currentDay, totalDays, currentDate] = progressMatch

          setAccountsProgress(prev => {
            const current = parseInt(currentDay)
            const total = parseInt(totalDays)
            const prevAccount = prev[accountId] || {
              ordersProcessed: 0,
              daysProcessed: 0,
              totalDays: 0,
              isComplete: false,
              processedDates: [],
              currentDayNumber: 0,
              currentDate: '',
              current: 0,
              total: 0
            }

            // Only update if it's a newer progress
            if (current > prevAccount.current || total !== prevAccount.total) {
              const daysProcessed = Math.max(current - 1, 0)

              return {
                ...prev,
                [accountId]: {
                  ...prevAccount,
                  currentDayNumber: current,
                  totalDays: total,
                  currentDate: currentDate || prevAccount.currentDate,
                  daysProcessed,
                  processedDates: [...new Set([...(prevAccount.processedDates || []), currentDate])].filter(Boolean),
                  current,
                  total,
                  isComplete: current === total
                }
              }
            }

            return prev
          })

          // Update current account if not set
          if (!currentAccount) {
            setCurrentAccount(accountId)
          }
        }
        break
    }

  }, [currentAccount, setCurrentAccount, refreshTrades])


  const connect = useCallback((url: string, token: string, accounts: string[], startDate: string) => {
    console.log('WebSocket connect called with:', {
      url,
      token: token ? '***' : 'null',
      accounts,
      startDate
    })

    if (ws) {
      console.log('Closing existing connection before creating new one')
      ws.close()
    }

    // Only reset processing state, keep message history
    resetProcessingState()
    setSelectedAccounts(accounts)

    // Initialize account progress
    const initialProgress = accounts.reduce((acc, accountId) => ({
      ...acc,
      [accountId]: {
        ordersProcessed: 0,
        daysProcessed: 0,
        totalDays: 0,
        isComplete: false,
        processedDates: [],
        currentDayNumber: 0,
        currentDate: '',
        lastProcessedDate: '',
        current: 0,
        total: 0
      }
    }), {})

    setAccountsProgress(initialProgress)
    setCurrentAccount(null)

    console.log('Creating WebSocket connection to:', url)
    const newWs = new WebSocket(url)

  

    newWs.onopen = () => {
      console.log('WebSocket connection established')
      setIsConnected(true)
      setConnectionStatus('Connected')

      handleMessage({
        type: 'connection_status',
        status: 'Connected',
        message: 'WebSocket connection established'
      })

      // Send init message immediately after connection
      const message = {
        type: 'init',
        token,
        accounts,
        start_date: startDate
      }
      newWs.send(JSON.stringify(message))

    }

    newWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setConnectionStatus(`Failed to parse message: ${errorMessage}`)
        handleMessage({
          type: 'connection_status',
          status: `Failed to parse message: ${errorMessage}`,
          message: 'Failed to parse server message'
        })
      }
    }

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('WebSocket error occurred')
      handleMessage({
        type: 'connection_status',
        status: 'WebSocket error occurred',
        message: 'WebSocket connection error occurred'
      })
      // Reset auto sync state on error
      setIsAutoSyncing(false)
      // Close connection on error
      disconnect()
    }

    newWs.onclose = (event) => {
      setIsConnected(false)
      const closeMessage = event.reason || 'Connection closed'
      const status = `Disconnected: ${closeMessage}`
      setConnectionStatus(status)
      handleMessage({
        type: 'connection_status',
        status,
        message: `WebSocket disconnected: ${closeMessage}`
      })
      // Reset auto sync state on close
      setIsAutoSyncing(false)
    }

    setWs(newWs)
  }, [ws, handleMessage, disconnect, resetProcessingState])

  // Extract common protocol logic
  const getProtocols = useCallback(() => {
    const isLocalhost = process.env.NEXT_PUBLIC_RITHMIC_API_URL?.includes('localhost')
    return {
      http: isLocalhost ? window.location.protocol : 'https:',
      ws: isLocalhost ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : 'wss:'
    }
  }, [])

  // Extract WebSocket URL construction
  const getWebSocketUrl = useCallback((baseUrl: string) => {
    const { ws } = getProtocols()
    return baseUrl.replace('ws://your-domain', `${ws}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}`)
  }, [getProtocols])

  // Update the shouldSync function to use the store's interval
  const shouldSync = useCallback((lastSyncTime: number) => {
    const now = Date.now()
    const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60)
    return minutesSinceLastSync >= syncInterval
  }, [syncInterval])


  // Run a sync for a credential
  const performSyncForCredential = useCallback(async (credentialId: string) => {

    const userId = await getUserId()
    // Ensure we are not already syncing
    // Prevent multiple syncs at the same time
    console.log('Is auto syncing', isAutoSyncing)
    console.log('User ID', userId)
    if (!userId || isAutoSyncing) return

    const savedData = getRithmicData(credentialId)
    
    // If we do not find the credential, return
    if (!savedData) return

    // Set the auto sync flag

    setIsAutoSyncing(true)

    try {
      console.error('Authenticating and getting accounts', JSON.stringify(savedData))
      // Authenticate and get accounts
      const { http } = getProtocols()
      const requestBody = {
        ...savedData.credentials,

        userId: userId

      }
      console.log('Making fetch request to:', `${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/accounts`)
      console.log('Request body:', requestBody)
      
      const response = await Promise.race([
        fetch(`${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({
            ...savedData.credentials,
            userId: userId
          })

        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auto-sync operation timed out')), 30000)
        )
      ]) as Response
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      // Handle rate limit error specifically
      if (response.status === 429) {
        const data = await response.json()
        const params = parseRateLimitMessage(data.detail)

        toast({
          title: t('rithmic.rateLimit.title'),
          description: t('rithmic.rateLimit.description', params),
          variant: "destructive",
        })

        return {
          success: false as const,
          rateLimited: true,
          message: data.detail || 'Rate limit exceeded'
        }
      }

      const data = await response.json()
      if (!data.success) throw new Error(data.message)

      // If allAccounts is true, use all available accounts
      const accountsToSync = savedData.allAccounts ? data.accounts.map((acc: any) => acc.account_id) : savedData.selectedAccounts

      setAvailableAccounts(data.accounts)
      const wsUrl = getWebSocketUrl(data.websocket_url)

      // Get most recent date for each account
      const mostRecentDates = accountsToSync.map((accountId: string) => {
        const accountTrades = trades.filter(trade => trade.accountNumber === accountId)
        if (accountTrades.length === 0) return null
        return Math.max(...accountTrades.map(trade => new Date(trade.entryDate).getTime()))
      }).filter(Boolean) as number[]

      let startDate: string

      // If no valid dates found, use 200 days ago as default
      if (mostRecentDates.length === 0) {
        const defaultDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
        startDate = defaultDate.toISOString().slice(0, 10).replace(/-/g, '')
      } else {
        // Find oldest of the most recent dates
        const oldestRecentDate = new Date(Math.min(...mostRecentDates))
        // Add 3 days buffer
        oldestRecentDate.setDate(oldestRecentDate.getDate() - 3)
        startDate = oldestRecentDate.toISOString().slice(0, 10).replace(/-/g, '')
      }

      // Connect and start syncing
      console.log('Connecting to WebSocket with:', { wsUrl, accountsToSync, startDate })
      connect(wsUrl, data.token, accountsToSync, startDate)
      updateLastSyncTime(credentialId)

      handleMessage({
        type: 'log',
        level: 'info',
        message: `Starting automatic background sync for ${savedData.name || savedData.credentials.username}`
      })
      
      console.log('Auto-sync completed successfully')
      return {
        success: true,
        rateLimited: false,
        message: 'Sync started successfully'
      }
    } catch (error) {
      console.error('Auto-sync error:', error)
      handleMessage({
        type: 'log',
        level: 'error',
        message: `Auto-sync error for credential set ${credentialId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      
      return {
        success: false,
        rateLimited: false,
        message: error instanceof Error ? error.message : 'Unknown error'
        
      }
    } finally {
        setIsAutoSyncing(false)

    }
  }, [isAutoSyncing, connect, handleMessage, getProtocols, getWebSocketUrl, t])

  // Update authenticateAndGetAccounts to return a rate limit response object
  const authenticateAndGetAccounts = useCallback(async (credentials: RithmicCredentials) => {
    const { http } = getProtocols()
    const response = await fetch(`${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    })

    // Handle rate limit error specifically
    if (response.status === 429) {
      const data = await response.json()
      const params = parseRateLimitMessage(data.detail)

      toast({
        title: t('rithmic.rateLimit.title'),
        description: t('rithmic.rateLimit.description', params),
        variant: "destructive",
      })

      return {
        success: false as const,
        rateLimited: true,
        message: data.detail || 'Rate limit exceeded'
      }
    }

    const data = await response.json()
    if (!data.success) {
      return {
        success: false as const,
        rateLimited: false,
        message: data.message
      }
    }

    return {
      success: true as const,
      rateLimited: false,
      token: data.token,
      websocket_url: getWebSocketUrl(data.websocket_url),
      accounts: data.accounts
    }
  }, [getProtocols, getWebSocketUrl, t])

  // Add calculateStartDate function
  const calculateStartDate = useCallback((selectedAccounts: string[]): string => {
    // Filter trades for selected accounts
    const accountTrades = trades.filter(trade => selectedAccounts.includes(trade.accountNumber))

    console.log('calculateStartDate called:', {
      selectedAccounts,
      totalTrades: trades.length,
      accountTrades: accountTrades.length
    })

    if (accountTrades.length === 0) {
      // If no trades found, return date 90 days ago
      const date = new Date()
      date.setDate(date.getDate() - 91)
      const startDate = date.toISOString().slice(0, 10).replace(/-/g, '')
      console.log('No trades found, using default start date:', startDate)
      return startDate
    }

    // Find the most recent trade date for each account
    const accountDates = selectedAccounts.map(accountId => {
      const accountTrades = trades.filter(trade => trade.accountNumber === accountId)
      if (accountTrades.length === 0) return null
      return Math.max(...accountTrades.map(trade => new Date(trade.entryDate).getTime()))
    }).filter(Boolean) as number[]

    // Get the oldest most recent date across all accounts
    const oldestRecentDate = new Date(Math.min(...accountDates))

    // Set to next day
    oldestRecentDate.setDate(oldestRecentDate.getDate() + 1)

    // Format as YYYYMMDD
    const startDate = oldestRecentDate.toISOString().slice(0, 10).replace(/-/g, '')
    console.log('Calculated start date from trades:', startDate)
    return startDate
  }, [trades])

  // Auto-sync checking effect
  useEffect(() => {
    const checkAndPerformSyncs = async () => {
      try {
        // Get all rithmic synchronizations for the current user
        const synchronizations = await getRithmicSynchronizations()
        
        for (const sync of synchronizations) {
          if (!sync.lastSyncedAt) continue
          
          const lastSyncTime = new Date(sync.lastSyncedAt).getTime()
          const now = Date.now()
          const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60)
          
          // Check if enough time has passed since last sync
          if (minutesSinceLastSync >= syncInterval) {
            console.log(`Auto-sync triggered for credential ${sync.id}`)
            await performSyncForCredential(sync.id)
          }
        }
      } catch (error) {
        console.error('Error during auto-sync check:', error)
      }
    }

    // Set up interval to check every minute
    const interval = setInterval(checkAndPerformSyncs, 60000) // 60 seconds
    setSyncCheckInterval(interval)

    // Run initial check
    checkAndPerformSyncs()

    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval)
        setSyncCheckInterval(null)
      }
    }
  }, [syncInterval]) // Only depend on syncInterval, not the functions

  return (
    <RithmicSyncContext.Provider value={{
      // Core connection management
      connect,
      disconnect,
      isConnected,
      connectionStatus,
      
      // Message handling
      lastMessage,
      messageHistory,
      handleMessage,
      
      // Progress tracking
      accountsProgress,
      currentAccount,
      processingStats,
      
      // Account management
      selectedAccounts,
      availableAccounts,
      setSelectedAccounts,
      setAvailableAccounts,
      
      // State management
      resetProcessingState,
      step,
      setStep,
      showAccountComparisonDialog,
      setShowAccountComparisonDialog,
      
      // Auto-sync functionality
      isAutoSyncing,
      performSyncForCredential,
      
      // Utilities
      calculateStartDate,
      authenticateAndGetAccounts,
      getWebSocketUrl,
    }}>
      {children}
    </RithmicSyncContext.Provider>
  )
}

export function useRithmicSyncContext() {
  const context = useContext(RithmicSyncContext)
  if (context === undefined) {
    throw new Error('useRithmicSyncContext must be used within a RithmicSyncContextProvider')
  }
  return context
} 