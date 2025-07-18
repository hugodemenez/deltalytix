'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { getRithmicData, getAllRithmicData, updateLastSyncTime, clearRithmicData, saveRithmicData, RithmicCredentialSet } from '@/lib/rithmic-storage'
import { useData } from '@/context/data-provider'
import { toast } from "@/hooks/use-toast"
import { useI18n } from "@/locales/client"
import { useRithmicSyncStore, SyncInterval } from '@/store/rithmic-sync-store'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'

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
  performAutoSyncForCredential: (credentialId: string) => Promise<{ success: boolean; rateLimited: boolean; message: string } | undefined>
  showAccountComparisonDialog: boolean
  setShowAccountComparisonDialog: (show: boolean) => void
  compareAccounts: (savedAccounts: string[], newAccounts: { account_id: string; fcm_id: string }[]) => boolean
  reconnect: () => void
  maxSyncDuration: number
  setMaxSyncDuration: (duration: number) => void
  serverConfigs: Record<string, string[]>
  fetchServerConfigs: () => Promise<void>
  authenticateAndGetAccounts: (credentials: RithmicCredentials) => Promise<
    | { success: false; rateLimited: boolean; message: string }
    | { success: true; rateLimited: boolean; token: string; websocket_url: string; accounts: { account_id: string; fcm_id: string }[] }
  >
  getWebSocketUrl: (baseUrl: string) => string
  wsUrl: string | null
  token: string | null
  setWsUrl: (url: string | null) => void
  setToken: (token: string | null) => void
  calculateStartDate: (selectedAccounts: string[]) => string
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
  const { refreshTrades } = useData()
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalAccountsAvailable: 0,
    accountsProcessed: 0,
    totalOrders: 0,
    isComplete: false
  })
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const syncIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [activeCredentialIds, setActiveCredentialIds] = useState<string[]>([])
  const activityTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [step, setStep] = useState<'credentials' | 'select-accounts' | 'processing'>('credentials')
  const [showAccountComparisonDialog, setShowAccountComparisonDialog] = useState(false)
  const [maxSyncDuration, setMaxSyncDuration] = useState(3600000) // 1 hour default
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3
  const reconnectDelayRef = useRef(1000) // Start with 1 second delay
  const syncStartTimeRef = useRef<number | undefined>(undefined)
  const syncTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastSyncAttemptRef = useRef<Record<string, number>>({})
  const SYNC_COOLDOWN = 5000 // 5 seconds cooldown between syncs for each credential
  const isInitialMountRef = useRef(true)
  const activeSyncRequestsRef = useRef<Set<string>>(new Set())
  const tabIdRef = useRef<string>(Math.random().toString(36).substring(7))
  const SYNC_LOCK_KEY = 'rithmic_sync_lock'
  const SYNC_LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes lock timeout
  const [serverConfigs, setServerConfigs] = useState<Record<string, string[]>>({})
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const t = useI18n()
  const { syncInterval } = useRithmicSyncStore()
  const user = useUserStore((state) => state.user)
  const trades = useTradesStore((state) => state.trades)

  // Helper function to check if it's a weekday
  const isWeekday = () => {
    const day = new Date().getDay()
    return day !== 0 && day !== 6 // 0 is Sunday, 6 is Saturday
  }

  // Function to acquire sync lock
  const acquireSyncLock = useCallback(() => {
    try {
      const lockData = localStorage.getItem(SYNC_LOCK_KEY)
      const now = Date.now()

      if (!lockData) {
        // No lock exists, create one
        localStorage.setItem(SYNC_LOCK_KEY, JSON.stringify({
          tabId: tabIdRef.current,
          timestamp: now
        }))
        return true
      }

      const lock = JSON.parse(lockData)
      const lockAge = now - lock.timestamp

      // If lock is expired (older than 5 minutes), we can take it
      if (lockAge > SYNC_LOCK_TIMEOUT) {
        localStorage.setItem(SYNC_LOCK_KEY, JSON.stringify({
          tabId: tabIdRef.current,
          timestamp: now
        }))
        return true
      }

      // If lock is from this tab, we can keep it
      if (lock.tabId === tabIdRef.current) {
        return true
      }

      return false
    } catch (error) {
      console.error('Error acquiring sync lock:', error)
      return false
    }
  }, [SYNC_LOCK_TIMEOUT])

  // Function to release sync lock
  const releaseSyncLock = useCallback(() => {
    try {
      const lockData = localStorage.getItem(SYNC_LOCK_KEY)
      if (lockData) {
        const lock = JSON.parse(lockData)
        if (lock.tabId === tabIdRef.current) {
          localStorage.removeItem(SYNC_LOCK_KEY)
        }
      }
    } catch (error) {
      console.error('Error releasing sync lock:', error)
    }
  }, [])

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
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
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
  }, [currentAccount, setCurrentAccount, refreshTrades])

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
  }, [disconnect, resetProcessingState, handleMessage])

  // Add heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, 10000) // Send heartbeat every 10 seconds
  }, [ws])

  const clearAllState = useCallback(() => {
    resetProcessingState()
    setMessageHistory([])
  }, [resetProcessingState])

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
    setProcessingStats({
      totalAccountsAvailable: accounts.length,
      accountsProcessed: 0,
      totalOrders: 0,
      isComplete: false
    })

    console.log('Creating WebSocket connection to:', url)
    const newWs = new WebSocket(url)

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (newWs.readyState !== WebSocket.OPEN) {
        console.log('WebSocket connection timeout')
        newWs.close()
        setIsAutoSyncing(false)
        handleMessage({
          type: 'connection_status',
          status: 'Connection timeout',
          message: 'WebSocket connection timed out'
        })
      }
    }, 10000) // 10 second timeout

    newWs.onopen = () => {
      console.log('WebSocket connection established')
      clearTimeout(connectionTimeout)
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
      newWs.send(JSON.stringify(message))
    }

    newWs.onmessage = (event) => {
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
      clearTimeout(connectionTimeout)
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
      clearTimeout(connectionTimeout)
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
      // Clear timeout on close
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }

    setWs(newWs)

    // Set sync start time
    syncStartTimeRef.current = Date.now()

    // Set maximum sync duration timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      console.log('Maximum sync duration reached')
      handleMessage({
        type: 'log',
        level: 'warning',
        message: `Sync operation exceeded maximum duration of ${maxSyncDuration / 1000} seconds`
      })
      disconnect()
    }, maxSyncDuration)

    // Start heartbeat
    startHeartbeat()
  }, [ws, handleMessage, resetActivityTimeout, disconnect, resetProcessingState, startHeartbeat, maxSyncDuration])

  // Function to compare account lists and return true if they differ
  const compareAccounts = useCallback((savedAccounts: string[], newAccounts: { account_id: string; fcm_id: string }[]) => {
    if (savedAccounts.length !== newAccounts.length) return true

    const newAccountIds = newAccounts.map(acc => acc.account_id)
    return savedAccounts.some(acc => !newAccountIds.includes(acc)) ||
      newAccountIds.some(acc => !savedAccounts.includes(acc))
  }, [])

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

  // Modify performAutoSyncForCredential
  const performAutoSyncForCredential = useCallback(async (credentialId: string) => {

    if (!user?.id || isAutoSyncing) return

    // Check if this credential is already being synced
    if (activeSyncRequestsRef.current.has(credentialId)) {
      console.log(`Skipping sync for credential ${credentialId} - already in progress`)
      return
    }

    // Check if we're within the cooldown period for this credential
    const now = Date.now()
    const lastAttempt = lastSyncAttemptRef.current[credentialId] || 0
    if (now - lastAttempt < SYNC_COOLDOWN) {
      console.log(`Skipping sync for credential ${credentialId} due to cooldown`)
      return
    }

    // Mark this credential as being synced
    activeSyncRequestsRef.current.add(credentialId)

    // Update last attempt time
    lastSyncAttemptRef.current[credentialId] = now

    const savedData = getRithmicData(credentialId)
    if (!savedData) {
      activeSyncRequestsRef.current.delete(credentialId)
      return
    }

    setIsAutoSyncing(true)

    try {
      const { http } = getProtocols()
      const response = await Promise.race([
        fetch(`${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...savedData.credentials,
            userId: user.id
          })
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auto-sync operation timed out')), 30000)
        )
      ]) as Response

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

      // Compare accounts and show dialog if they differ
      const accountsDiffer = compareAccounts(accountsToSync, data.accounts)
      if (accountsDiffer) {
        setAvailableAccounts(data.accounts)
        setSelectedAccounts(accountsToSync)
        setShowAccountComparisonDialog(true)
        return
      }

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
      connect(wsUrl, data.token, accountsToSync, startDate)
      updateLastSyncTime(credentialId)

      handleMessage({
        type: 'log',
        level: 'info',
        message: `Starting automatic background sync for ${savedData.name || savedData.credentials.username}`
      })
    } catch (error) {
      console.error('Auto-sync error:', error)
      handleMessage({
        type: 'log',
        level: 'error',
        message: `Auto-sync error for credential set ${credentialId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      if (typeof window !== 'undefined') {
        setIsAutoSyncing(false)
        activeSyncRequestsRef.current.delete(credentialId)
      }
    }
  }, [isAutoSyncing, connect, handleMessage, compareAccounts, getProtocols, getWebSocketUrl, t])

  // Function to check and sync all credentials
  const performAutoSync = useCallback(async () => {
    if (!isWeekday()) {
      console.log('Skipping auto-sync during weekend')
      return
    }

    // Try to acquire sync lock
    if (!acquireSyncLock()) {
      console.log('Another tab is currently syncing, skipping sync in this tab')
      return
    }

    try {
      const allData = getAllRithmicData()
      const now = Date.now()

      // Process credentials sequentially with a delay between each
      for (const [id, data] of Object.entries(allData)) {
        if (shouldSync(new Date(data.lastSyncTime).getTime())) {
          await performAutoSyncForCredential(id)
          // Add a delay between processing each credential
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }
    } finally {
      // Always release the lock when done
      releaseSyncLock()
    }
  }, [performAutoSyncForCredential, shouldSync, acquireSyncLock, releaseSyncLock])

  // Add mergeDuplicateCredentials function
  const mergeDuplicateCredentials = useCallback(() => {
    const allData = getAllRithmicData()
    const usernames = new Map<string, RithmicCredentialSet[]>()

    // Group credentials by username
    Object.values(allData).forEach(cred => {
      const existing = usernames.get(cred.credentials.username) || []
      usernames.set(cred.credentials.username, [...existing, cred])
    })

    // Process each username group
    usernames.forEach((credentials, username) => {
      if (credentials.length > 1) {
        // Merge all selected accounts and remove duplicates
        const mergedSelectedAccounts = Array.from(new Set(
          credentials.flatMap(cred => cred.selectedAccounts)
        ))

        // Use the most recent sync time
        const mostRecentSync = Math.max(
          ...credentials.map(cred => new Date(cred.lastSyncTime).getTime()),
          Date.now()
        )

        // Use the most recent allAccounts setting
        const mergedAllAccounts = credentials.some(cred => cred.allAccounts)

        const dataToSave = {
          id: credentials[0].id, // Use the ID of the first existing credential
          credentials: credentials[0].credentials,
          selectedAccounts: mergedSelectedAccounts,
          lastSyncTime: new Date(mostRecentSync).toISOString(),
          allAccounts: mergedAllAccounts
        }

        // Delete all other credentials with the same username
        credentials.forEach(cred => {
          if (cred.id !== dataToSave.id) {
            clearRithmicData(cred.id)
          }
        })

        // Save the merged credential
        saveRithmicData(dataToSave)

        // Show toast notification
        toast({
          title: t('rithmic.credentials.merged'),
          description: t('rithmic.credentials.mergedDescription'),
        })
      }
    })
  }, [t])

  // Update the interval setup in useEffect
  useEffect(() => {
    // Only perform initial check on mount if it's the first mount
    if (isInitialMountRef.current) {
      mergeDuplicateCredentials()
      performAutoSync()
      isInitialMountRef.current = false
    }

    // Set up interval for future checks using the store's interval
    syncIntervalRef.current = setInterval(() => {
      performAutoSync()
    }, syncInterval * 60 * 1000) // Convert minutes to milliseconds

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SYNC_LOCK_KEY && !e.newValue) {
        // Another tab released the lock, we can try to sync
        performAutoSync()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
      window.removeEventListener('storage', handleStorageChange)
      // Release lock when component unmounts
      releaseSyncLock()
    }
  }, [performAutoSync, releaseSyncLock, mergeDuplicateCredentials, syncInterval])

  // Clear interval and release lock when user changes
  useEffect(() => {
    const unsubscribeUser = useUserStore.subscribe((state) => state.user)
    if (!user?.id) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
      releaseSyncLock()
    }
  }, [releaseSyncLock])

  // Add reconnection logic
  const reconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      handleMessage({
        type: 'log',
        level: 'error',
        message: 'Max reconnection attempts reached. Please try again later.'
      })
      return
    }

    const delay = reconnectDelayRef.current * Math.pow(2, reconnectAttemptsRef.current)
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)

    setTimeout(() => {
      reconnectAttemptsRef.current++
      if (ws?.url) {
        connect(ws.url, '', selectedAccounts, dateRange?.start || '')
      }
    }, delay)
  }, [ws, connect, selectedAccounts, dateRange, handleMessage])

  // Add fetchServerConfigs function
  const fetchServerConfigs = useCallback(async () => {
    try {
      const { http } = getProtocols()
      const response = await fetch(`${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/servers`)
      const data = await response.json()

      if (data.success) {
        setServerConfigs(data.servers)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Failed to fetch server configurations:', error)
      handleMessage({
        type: 'log',
        level: 'error',
        message: 'Failed to fetch server configurations'
      })
    }
  }, [getProtocols, handleMessage])

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
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
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
      performAutoSyncForCredential,
      showAccountComparisonDialog,
      setShowAccountComparisonDialog,
      compareAccounts,
      reconnect,
      maxSyncDuration,
      setMaxSyncDuration,
      serverConfigs,
      fetchServerConfigs,
      authenticateAndGetAccounts,
      getWebSocketUrl,
      wsUrl,
      token,
      setWsUrl,
      setToken,
      calculateStartDate,
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