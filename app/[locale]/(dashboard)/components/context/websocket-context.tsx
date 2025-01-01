'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

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
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalAccountsAvailable: 0,
    accountsProcessed: 0,
    totalOrders: 0,
    isComplete: false
  })
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)

  const handleMessage = useCallback((message: any) => {
    if (!message) return
    
    setLastMessage(message)
    console.log('Processing message:', message)
    
    if (message.type === 'order_update') {
      setOrders(prev => [...prev, message.order])
      if (message.account_id) {
        setAccountsProgress(prev => ({
          ...prev,
          [message.account_id]: {
            ...prev[message.account_id],
            ordersProcessed: (prev[message.account_id]?.ordersProcessed || 0) + 1
          }
        }))
      }
    } else if (message.type === 'log') {
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
        console.log('Found processing date message:', message.message)
        const match = message.message.match(/Processing date (\d+) of (\d+)(?:: (\d{8}))?/)
        if (match) {
          const [, currentDay, totalDays, currentDate] = match
          
          // Look for the account that is currently not complete and has matching total days
          setAccountsProgress(prev => {
            const entries = Object.entries(prev)
            const activeAccount = entries.find(([_, progress]) => 
              !progress.isComplete && progress.totalDays === parseInt(totalDays)
            )
            
            if (!activeAccount) {
              console.warn('No matching active account found for date processing:', {
                currentDay,
                totalDays,
                currentDate,
                message: message.message
              })
              return prev
            }
            
            const [accountId, currentProgress] = activeAccount
            console.log('Updating progress for day:', { accountId, currentDay, totalDays, currentDate })

            // Calculate the actual days processed based on the current day number
            const daysProcessed = Math.max(parseInt(currentDay) - 1, 0)

            return {
              ...prev,
              [accountId]: {
                ...currentProgress,
                currentDayNumber: parseInt(currentDay),
                totalDays: parseInt(totalDays),
                currentDate: currentDate || '',
                daysProcessed: daysProcessed,
                processedDates: currentProgress.processedDates || []
              }
            }
          })
        } else {
          console.log('Failed to match processing date message format:', message.message)
        }
      } else if (message.message.includes('Successfully processed orders for date')) {
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
      } else if (message.message.includes('Successfully added account')) {
        const accountId = message.message.match(/account ([^"]+)/)?.[1]
        if (accountId) {
          console.log('Adding new account:', accountId)
          setAccountsProgress(prev => ({
            ...prev,
            [accountId]: {
              ...prev[accountId],
              ordersProcessed: 0,
              daysProcessed: 0,
              totalDays: 0, // Will be set when processing starts
              isComplete: false,
              processedDates: [],
              currentDayNumber: 0,
              currentDate: '',
              lastProcessedDate: ''
            }
          }))
        }
      } else if (message.message.includes('Starting processing for account')) {
        // Extract account ID from "Starting processing for account X of Y: ACCOUNT_ID"
        const accountMatch = message.message.match(/account \d+ of \d+: ([^"\s]+)/)
        const accountId = accountMatch?.[1]
        if (accountId) {
          console.log('Starting to process account:', accountId)
          setCurrentAccount(accountId)
          
          // Initialize progress for this account if not already done
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
            return {
              ...prev,
              [accountId]: {
                ...currentProgress,
                ordersProcessed: 0,
                daysProcessed: 0,
                isComplete: false,
                processedDates: [],
                currentDayNumber: 0,
                currentDate: '',
                lastProcessedDate: ''
              }
            }
          })
        } else {
          console.warn('Failed to extract account ID from starting message:', message)
        }
      } else if (message.message.includes('Completed processing account') && message.message.includes('collected')) {
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
    } else if (message.type === 'status') {
      if (message.all_complete) {
        setProcessingStats(prev => ({
          ...prev,
          isComplete: true,
          totalOrders: message.total_orders || prev.totalOrders
        }))
      }
    } else if (message.type === 'init_stats') {
      setProcessingStats(prev => ({
        ...prev,
        totalAccountsAvailable: message.total_accounts,
        accountsProcessed: 0,
        totalOrders: 0,
        isComplete: false
      }))
    } else if (message.type === 'date_range') {
      setDateRange({ start: message.start_date, end: message.end_date })
    }
    
    if (message.type === 'error') {
      setConnectionStatus(prev => {
        const newStatus = 'Error: ' + message.message
        return prev === newStatus ? prev : newStatus
      })
    }
  }, [currentAccount])

  const connect = useCallback((url: string, token: string, accounts: string[], startDate: string) => {
    if (ws) {
      console.log('Closing existing connection before creating new one')
      ws.close()
    }

    // Set selected accounts
    setSelectedAccounts(accounts)

    // Reset states with proper initialization
    const initialProgress = accounts.reduce((acc, accountId) => ({
      ...acc,
      [accountId]: {
        ordersProcessed: 0,
        daysProcessed: 0,
        totalDays: 0, // Will be set dynamically when processing starts
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
    setDateRange(null)
    setOrders([])

    console.log('Creating new WebSocket connection to:', url)
    const newWs = new WebSocket(url)

    newWs.onopen = () => {
      console.log('WebSocket connection established')
      setIsConnected(true)
      setConnectionStatus('Connected')
      setLastMessage({ type: 'status', message: 'WebSocket connection established' })

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
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setConnectionStatus(`Failed to parse message: ${errorMessage}`)
        setLastMessage({ 
          type: 'error', 
          message: 'Failed to parse server message' 
        })
      }
    }

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('WebSocket error occurred')
      setLastMessage({ 
        type: 'error', 
        message: 'WebSocket connection error occurred' 
      })
    }

    newWs.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason)
      setIsConnected(false)
      const closeMessage = event.reason || 'Connection closed'
      setConnectionStatus(prev => {
        const newStatus = `Disconnected: ${closeMessage}`
        return prev === newStatus ? prev : newStatus
      })
      setLastMessage({ 
        type: 'status', 
        message: `WebSocket disconnected: ${closeMessage}` 
      })
    }

    setWs(newWs)
  }, [ws, handleMessage])

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close()
      setWs(null)
      setIsConnected(false)
      setConnectionStatus('Disconnected')
      setOrders([])
      setAccountsProgress({})
      setCurrentAccount(null)
      setProcessingStats({
        totalAccountsAvailable: 0,
        accountsProcessed: 0,
        totalOrders: 0,
        isComplete: false
      })
      setDateRange(null)
    }
  }, [ws])

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
      setAvailableAccounts
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