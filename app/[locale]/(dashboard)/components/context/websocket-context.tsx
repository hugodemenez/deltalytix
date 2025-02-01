'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { getRithmicData, getAllRithmicData, updateLastSyncTime } from '@/lib/rithmic-storage'
import { useUserData } from '@/components/context/user-data'

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
  totalOrders: number
  isComplete: boolean
}

interface WebSocketContextType {
  connect: (url: string, token: string, accounts: string[], startDate: string) => void
  disconnect: () => void
  isConnected: boolean
  lastMessage: any
  connectionStatus: string
  orders: any[]
  accountsProgress: Record<string, AccountProgress>
  currentAccount: string | null
  processingStats: ProcessingStats
  dateRange: { start: string; end: string } | null
  selectedAccounts: string[]
  availableAccounts: { account_id: string; fcm_id: string }[]
  setSelectedAccounts: (accounts: string[]) => void
  setAvailableAccounts: (accounts: { account_id: string; fcm_id: string }[]) => void
  resetProcessingState: () => void
  feedbackMessages: string[]
  messageHistory: any[]
  handleMessage: (message: any) => void
  clearAllState: () => void
  lastSyncTime: Date | null
  isAutoSyncing: boolean
  activeCredentialIds: string[]
  step: 'credentials' | 'select-accounts' | 'processing'
  setStep: (step: 'credentials' | 'select-accounts' | 'processing') => void
  performAutoSyncForCredential: (credentialId: string) => Promise<void>
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [orders, setOrders] = useState<any[]>([])
  const [accountsProgress, setAccountsProgress] = useState<Record<string, AccountProgress>>({})
  const [currentAccount, setCurrentAccount] = useState<string | null>(null)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [availableAccounts, setAvailableAccounts] = useState<{ account_id: string; fcm_id: string }[]>([])
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([])
  const [messageHistory, setMessageHistory] = useState<any[]>([])
  const { refreshTrades, trades, user } = useUserData()
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalAccountsAvailable: 0,
    accountsProcessed: 0,
    totalOrders: 0,
    isComplete: false
  })
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const syncIntervalRef = useRef<NodeJS.Timeout>()
  const [activeCredentialIds, setActiveCredentialIds] = useState<string[]>([])
  const activityTimeoutRef = useRef<NodeJS.Timeout>()
  const [step, setStep] = useState<'credentials' | 'select-accounts' | 'processing'>('credentials')

  // Helper function to check if it's a weekday
  const isWeekday = () => {
    const day = new Date().getDay()
    return day !== 0 && day !== 6 // 0 is Sunday, 6 is Saturday
  }

  const resetProcessingState = useCallback(() => {
    setProcessingStats({
      totalAccountsAvailable: 0,
      accountsProcessed: 0,
      totalOrders: 0,
      isComplete: false
    })
    setOrders([])
    setAccountsProgress({})
    setCurrentAccount(null)
    setDateRange(null)
    setFeedbackMessages([])
  }, [])

  const disconnect = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    if (ws) {
      console.log('Disconnecting WebSocket')
      ws.close()
      setWs(null)
      setIsConnected(false)
      setConnectionStatus('Disconnected')
      resetProcessingState()
    }
  }, [ws, resetProcessingState])

  const resetActivityTimeout = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    
    activityTimeoutRef.current = setTimeout(() => {
      console.log('WebSocket inactive for 15 seconds, closing connection')
      handleMessage({
        type: 'log',
        level: 'warning',
        message: 'Connection timeout: No activity for 15 seconds'
      })
      disconnect()
      setIsConnected(false)
      setConnectionStatus('Disconnected: Timeout')
      resetProcessingState()
      setStep('credentials')
    }, 15000)
  }, [disconnect, resetProcessingState])

  const handleMessage = useCallback((message: any) => {
    if (!message) return
    
    setLastMessage(message)
    console.log('Processing message:', message)
    
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
                    daysProcessed: 0
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
                console.log('Updating progress for day:', { accountId, currentDay, totalDays, currentDate })

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
              console.log('Successfully processed date:', { accountId, date })
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
              console.log('Adding new account:', accountId)
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
              console.log('Starting to process account:', accountId)
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
              console.log('Completed processing account:', { accountId, ordersCount })
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
              setProcessingStats(prev => ({
                ...prev,
                accountsProcessed: prev.accountsProcessed + 1,
                totalOrders: prev.totalOrders + ordersCount
              }))
            }
          }
        }
        break

      case 'order_update':
        setOrders(prev => [...prev, message.order])
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
        setProcessingStats(prev => ({
          ...prev,
          isComplete: true,
          totalOrders: message.total_orders || prev.totalOrders
        }))
        break

      case 'status':
        if (message.all_complete) {
          setProcessingStats(prev => ({
            ...prev,
            isComplete: true,
            totalOrders: message.total_orders || prev.totalOrders
          }))
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

    // Add to feedback messages if needed
    let messageType = 'log'
    let shouldAddMessage = true
    let messageContent = message.message || JSON.stringify(message)

    // Handle connection status messages
    if (message.type === 'connection_status') {
      messageType = message.status.toLowerCase().includes('error') ? 'error' : 'status'
      messageContent = message.status
      shouldAddMessage = true
    }

    if (shouldAddMessage) {
      const messageString = JSON.stringify({ type: messageType, message: messageContent })
      setFeedbackMessages(prev => {
        // Prevent duplicate messages
        if (prev[prev.length - 1] === messageString) {
          return prev
        }
        return [...prev, messageString]
      })
    }
  }, [currentAccount, setCurrentAccount])

  const clearAllState = useCallback(() => {
    resetProcessingState()
    setMessageHistory([])
  }, [resetProcessingState])

  const connect = useCallback((url: string, token: string, accounts: string[], startDate: string) => {
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
        lastProcessedDate: ''
      }
    }), {})

    setAccountsProgress(initialProgress)
    setCurrentAccount(null)
    setProcessingStats({
      totalAccountsAvailable: accounts.length,
      accountsProcessed: 0,
      totalOrders: 0,
      isComplete: false
    })

    console.log('Creating new WebSocket connection to:', url)
    const newWs = new WebSocket(url)

    newWs.onopen = () => {
      console.log('WebSocket connection established')
      setIsConnected(true)
      setConnectionStatus('Connected')
      
      // Start activity timeout as soon as connection opens
      resetActivityTimeout()
      
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
      console.log('Sending init message:', message)
      newWs.send(JSON.stringify(message))
    }

    newWs.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data)
      try {
        const message = JSON.parse(event.data)
        // Reset timeout before processing message
        resetActivityTimeout()
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
      // Close connection on error
      disconnect()
    }

    newWs.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason)
      setIsConnected(false)
      const closeMessage = event.reason || 'Connection closed'
      const status = `Disconnected: ${closeMessage}`
      setConnectionStatus(status)
      handleMessage({ 
        type: 'connection_status', 
        status,
        message: `WebSocket disconnected: ${closeMessage}` 
      })
      // Clear timeout on close
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }

    setWs(newWs)
  }, [ws, handleMessage, resetActivityTimeout, disconnect, resetProcessingState])

  // Function to perform automatic sync for a single credential set
  const performAutoSyncForCredential = useCallback(async (credentialId: string) => {
    if (!user?.id || isAutoSyncing) return

    const savedData = getRithmicData(credentialId)
    if (!savedData) return

    setIsAutoSyncing(true)
    
    try {
      const isLocalhost = process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
      const protocol = isLocalhost ? window.location.protocol : 'https:'
      
      const response = await fetch(`${protocol}//${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...savedData.credentials,
          userId: user.id
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }

      setAvailableAccounts(data.accounts)
      const wsProtocol = isLocalhost ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : 'wss:'
      const wsUrl = data.websocket_url.replace('ws://your-domain', 
        `${wsProtocol}//${process.env.NEXT_PUBLIC_API_URL}`)

      // Calculate start date based on existing trades
      const accountTrades = trades.filter(trade => savedData.selectedAccounts.includes(trade.accountNumber))
      let startDate: string

      if (accountTrades.length === 0) {
        // If no trades found, return date 90 days ago
        const date = new Date()
        date.setDate(date.getDate() - 200)
        startDate = date.toISOString().slice(0, 10).replace(/-/g, '')
      } else {
        // Find the most recent trade date for each account
        const accountDates = savedData.selectedAccounts.map(accountId => {
          const accountTrades = trades.filter(trade => trade.accountNumber === accountId)
          if (accountTrades.length === 0) return null
          return Math.max(...accountTrades.map(trade => new Date(trade.entryDate).getTime()))
        }).filter(Boolean) as number[]

        // Get the oldest most recent date across all accounts
        const oldestRecentDate = new Date(Math.min(...accountDates))
        
        // Set to next day
        oldestRecentDate.setDate(oldestRecentDate.getDate() + 1)
        
        // Format as YYYYMMDD
        startDate = oldestRecentDate.toISOString().slice(0, 10).replace(/-/g, '')
      }

      // Connect and start syncing
      connect(wsUrl, data.token, savedData.selectedAccounts, startDate)
      updateLastSyncTime(credentialId)
      
      handleMessage({
        type: 'log',
        level: 'info',
        message: `Starting automatic background sync for ${savedData.name || savedData.credentials.username}`
      })
    } catch (error) {
      console.error('Auto-sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      handleMessage({
        type: 'log',
        level: 'error',
        message: `Auto-sync error for credential set ${credentialId}: ${errorMessage}`
      })
    } finally {
      setIsAutoSyncing(false)
    }
  }, [user?.id, isAutoSyncing, connect, handleMessage, trades])

  // Function to check and sync all credentials
  const performAutoSync = useCallback(async () => {
    // Skip auto-sync during weekends
    if (!isWeekday()) {
      console.log('Skipping auto-sync during weekend')
      return
    }

    const allData = getAllRithmicData()
    const now = new Date().getTime()

    for (const [id, data] of Object.entries(allData)) {
      const lastSync = new Date(data.lastSyncTime).getTime()
      const hoursSinceLastSync = (now - lastSync) / (1000 * 60 * 60)
      
      if (hoursSinceLastSync >= 1) {
        await performAutoSyncForCredential(id)
      }
    }
  }, [performAutoSyncForCredential])

  // Set up automatic sync interval
  useEffect(() => {
    // Initial check on mount
    performAutoSync()

    // Set up interval for future checks
    syncIntervalRef.current = setInterval(() => {
      performAutoSync()
    }, 60 * 1000) // Check every minute

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [performAutoSync])

  // Clear interval when user changes
  useEffect(() => {
    if (!user?.id && syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }
  }, [user?.id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ 
      connect, 
      disconnect, 
      isConnected,
      lastMessage,
      connectionStatus,
      orders,
      accountsProgress,
      currentAccount,
      processingStats,
      dateRange,
      selectedAccounts,
      availableAccounts,
      setSelectedAccounts,
      setAvailableAccounts,
      resetProcessingState,
      feedbackMessages,
      messageHistory,
      handleMessage,
      clearAllState,
      lastSyncTime,
      isAutoSyncing,
      activeCredentialIds,
      step,
      setStep,
      performAutoSyncForCredential
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
} 