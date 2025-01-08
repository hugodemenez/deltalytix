'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useUser } from '@/components/context/user-data'
import { toast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'
import { saveTrades } from '@/server/database'
import { useTrades } from '@/components/context/trades-data'
import { RithmicSyncFeedback } from './rithmic-sync-feedback'
import { useWebSocket } from '../context/websocket-context'

interface RithmicCredentials {
  username: string
  password: string
  server_type: string
  location: string
  userId: string
}

interface ServerConfigurations {
  [key: string]: string[]
}

interface RithmicAccount {
  account_id: string
  fcm_id: string
}

interface RithmicOrder {
  order_id: string
  account_id: string
  ticker: string
  exchange: string
  buy_sell_type: string
  order_type: string
  status: string
  quantity: number
  filled_quantity: number
  price: number
  commission: number
  timestamp: number
}

interface RithmicSyncCombinedProps {
  onSync: (data: { credentials: RithmicCredentials, orders: Record<string, any>[] }) => Promise<void>
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function RithmicSyncCombined({ onSync, setIsOpen }: RithmicSyncCombinedProps) {
  const { user } = useUser()
  const { refreshTrades, trades } = useTrades()
  const { 
    connect, 
    disconnect, 
    isConnected, 
    lastMessage, 
    connectionStatus, 
    orders: wsOrders,
    selectedAccounts,
    setSelectedAccounts,
    availableAccounts,
    setAvailableAccounts
  } = useWebSocket()
  const [step, setStep] = useState<'credentials' | 'select-accounts' | 'processing'>('credentials')
  const [isLoading, setIsLoading] = useState(false)
  const [serverConfigs, setServerConfigs] = useState<ServerConfigurations>({})
  
  // Check for active connection on mount
  useEffect(() => {
    if (isConnected && selectedAccounts.length > 0) {
      console.log('Active connection detected, resuming processing view')
      setStep('processing')
    }
  }, [isConnected, selectedAccounts])

  const [credentials, setCredentials] = useState<RithmicCredentials>({
    username: '',
    password: '',
    server_type: 'Rithmic Paper Trading',
    location: 'Chicago Area',
    userId: user?.id || ''
  })
  const [token, setToken] = useState<string | null>(null)
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([])
  const [messageHistory, setMessageHistory] = useState<any[]>([])
  const completionCheckRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch server configurations on mount and set defaults
  useEffect(() => {
    async function fetchServerConfigs() {
      try {
        const isLocalhost = process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
        const protocol = isLocalhost ? window.location.protocol : 'https:'
        const response = await fetch(`${protocol}//${process.env.NEXT_PUBLIC_API_URL}/servers`)
        const data = await response.json()
        
        if (data.success) {
          setServerConfigs(data.servers)
          
          // Verify if our defaults exist in the server configs
          const hasDefaultServer = 'Rithmic Paper Trading' in data.servers
          const hasDefaultLocation = hasDefaultServer && data.servers['Rithmic Paper Trading'].includes('Chicago Area')
          
          // If defaults don't exist, set to first available options
          if (!hasDefaultServer || !hasDefaultLocation) {
            const firstServerType = Object.keys(data.servers)[0]
            const firstLocation = data.servers[firstServerType][0]
            
            setCredentials(prev => ({
              ...prev,
              server_type: firstServerType,
              location: firstLocation
            }))
          }
        } else {
          throw new Error(data.message)
        }
      } catch (error) {
        console.error('Failed to fetch server configurations:', error)
        setFeedbackMessages(prev => [...prev, JSON.stringify({ 
          type: 'error', 
          message: `Error fetching server configurations: ${error instanceof Error ? error.message : 'Unknown error'}` 
        })])
      }
    }
    
    fetchServerConfigs()
  }, [])

  // Update feedback messages when receiving WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      // Add message to history
      setMessageHistory(prev => {
        const newHistory = [...prev, lastMessage]
        
        // Check for completion message in history
        const hasCompletionMessage = newHistory.some(
          msg => msg.type === 'complete' && msg.status === 'all_complete'
        )

        if (hasCompletionMessage) {
          console.log('Completion message found in history')
          // Clear any existing completion check
          if (completionCheckRef.current) {
            clearTimeout(completionCheckRef.current)
          }

          // Set a 5 second delay to ensure all processing is done
          completionCheckRef.current = setTimeout(() => {
            console.log('Executing completion actions')
            refreshTrades()
            // Add a small delay before closing to ensure trades are refreshed
            setTimeout(() => {
              disconnect() // Disconnect WebSocket before closing modal
              setIsOpen(false)
            }, 1000)
          }, 5000) // Increased to 5 seconds
        }

        return newHistory
      })

      let messageType = 'log'
      let shouldAddMessage = true
      let messageContent = lastMessage.message || JSON.stringify(lastMessage)

      switch (lastMessage.type) {
        case 'order_update':
          messageType = 'order'
          messageContent = `New order received: ${lastMessage.order?.order_id || 'Unknown'}`
          break
        case 'log':
          messageType = lastMessage.level === 'error' ? 'error' : 'log'
          messageContent = lastMessage.message || messageContent
          break
        case 'status':
          messageType = 'status'
          messageContent = lastMessage.message || messageContent
          break
        default:
          shouldAddMessage = false
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
    }
  }, [lastMessage, disconnect, refreshTrades, setIsOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (completionCheckRef.current) {
        clearTimeout(completionCheckRef.current)
      }
    }
  }, [])

  // Update feedback messages for connection status changes
  useEffect(() => {
    if (connectionStatus) {
      const messageString = JSON.stringify({ 
        type: connectionStatus.toLowerCase().includes('error') ? 'error' : 'status',
        message: connectionStatus 
      })
      setFeedbackMessages(prev => {
        // Prevent duplicate messages
        if (prev[prev.length - 1] === messageString) {
          return prev
        }
        return [...prev, messageString]
      })
    }
  }, [connectionStatus])

  function handleStartProcessing() {
    setIsLoading(true)
    setStep('processing')

    if (!token || !wsUrl) {
      setFeedbackMessages(prev => [...prev, JSON.stringify({ 
        type: 'error', 
        message: 'No token or WebSocket URL available. Please reconnect.' 
      })])
      setIsLoading(false)
      return
    }

    const startDate = calculateStartDate(selectedAccounts)
    console.log('Connecting to WebSocket:', wsUrl)
    connect(wsUrl, token, selectedAccounts, startDate)
  }

  async function handleConnect(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    // Disconnect existing WebSocket connection if any
    if (isConnected) {
      console.log('Disconnecting existing WebSocket connection before new connection attempt')
      disconnect()
    }

    try {
      const isLocalhost = process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
      const protocol = isLocalhost ? window.location.protocol : 'https:'
      const response = await fetch(`${protocol}//${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          server_type: credentials.server_type,
          location: credentials.location,
          user_id: credentials.userId
        })
      })

      const data = await response.json()
      console.log('Account response:', data)

      if (!data.success) {
        throw new Error(data.message)
      }

      setAvailableAccounts(data.accounts)
      setToken(data.token)
      const wsProtocol = isLocalhost ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : 'wss:'
      setWsUrl(data.websocket_url.replace('ws://your-domain', 
        `${wsProtocol}//${process.env.NEXT_PUBLIC_API_URL}`))
      console.log('Token set:', data.token)
      console.log('WebSocket URL set:', data.websocket_url)
      setStep('select-accounts')
      setFeedbackMessages(prev => [...prev, JSON.stringify({ 
        type: 'status', 
        message: `Retrieved ${data.accounts.length} accounts. Please select accounts and click "Start Processing"` 
      })])
    } catch (error) {
      console.error('Connection error:', error)
      setFeedbackMessages(prev => [...prev, JSON.stringify({ 
        type: 'error', 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })])
    } finally {
      setIsLoading(false)
    }
  }

  function calculateStartDate(selectedAccounts: string[]): string {
    // Filter trades for selected accounts
    const accountTrades = trades.filter(trade => selectedAccounts.includes(trade.accountNumber))
    
    if (accountTrades.length === 0) {
      // If no trades found, return date 30 days ago
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString().slice(0, 10).replace(/-/g, '')
    }

    // Find the most recent trade date using entryDate
    const mostRecentDate = new Date(Math.max(...accountTrades.map(trade => new Date(trade.entryDate).getTime())))
    
    // Set to next day
    mostRecentDate.setDate(mostRecentDate.getDate() + 1)
    
    // Format as YYYYMMDD
    return mostRecentDate.toISOString().slice(0, 10).replace(/-/g, '')
  }

  return (
    <div className="space-y-6">
      {step === 'credentials' && (
        <form onSubmit={handleConnect} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="rithmic-username">Rithmic Username</Label>
            <Input 
              id="rithmic-username" 
              name="rithmic-username"
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              autoComplete="off"
              spellCheck="false"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rithmic-password">Rithmic Password</Label>
            <Input 
              id="rithmic-password" 
              name="rithmic-password"
              type="password" 
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              autoComplete="new-password"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server-type">Server Type</Label>
            <Select
              name="server-type"
              value={credentials.server_type}
              onValueChange={(value) => {
                setCredentials(prev => ({ 
                  ...prev, 
                  server_type: value,
                  location: '' // Reset location when server type changes
                }))
              }}
            >
              <SelectTrigger id="server-type">
                <SelectValue placeholder="Select server type" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(serverConfigs).map((serverType) => (
                  <SelectItem key={serverType} value={serverType}>
                    {serverType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select
              name="location"
              value={credentials.location}
              onValueChange={(value) => setCredentials(prev => ({ ...prev, location: value }))}
              disabled={!credentials.server_type}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {credentials.server_type && serverConfigs[credentials.server_type]?.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !credentials.server_type || !credentials.location} 
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get Accounts
          </Button>
        </form>
      )}

      {step === 'select-accounts' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select Accounts to Import</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
              <Checkbox
                id="select-all"
                checked={availableAccounts.length > 0 && selectedAccounts.length === availableAccounts.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedAccounts(availableAccounts.map(account => account.account_id))
                  } else {
                    setSelectedAccounts([])
                  }
                }}
              />
              <Label 
                htmlFor="select-all"
                className="flex-1 cursor-pointer font-medium"
              >
                Select All Accounts
              </Label>
            </div>
            {availableAccounts.map((account) => (
              <div key={account.account_id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                <Checkbox
                  id={account.account_id}
                  checked={selectedAccounts.includes(account.account_id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedAccounts([...selectedAccounts, account.account_id])
                    } else {
                      setSelectedAccounts(selectedAccounts.filter(id => id !== account.account_id))
                    }
                  }}
                />
                <Label 
                  htmlFor={account.account_id}
                  className="flex-1 cursor-pointer"
                >
                  {account.account_id} 
                  <span className="text-sm text-muted-foreground ml-2">
                    (FCM ID: {account.fcm_id})
                  </span>
                </Label>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setStep('credentials')}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={handleStartProcessing}
              disabled={isLoading || selectedAccounts.length === 0}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Processing {selectedAccounts.length} Account{selectedAccounts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="space-y-4">
          <RithmicSyncFeedback 
            totalAccounts={selectedAccounts.length}
          />
        </div>
      )}
    </div>
  )
}


