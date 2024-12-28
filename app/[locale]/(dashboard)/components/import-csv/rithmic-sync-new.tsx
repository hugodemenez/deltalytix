'use client'

import { useState, useEffect, useCallback } from 'react'
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
  server: string
  userId: string
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
  const { connect, disconnect, sendMessage, isConnected } = useWebSocket()
  const [step, setStep] = useState<'credentials' | 'select-accounts' | 'processing'>('credentials')
  const [isLoading, setIsLoading] = useState(false)
  const [credentials, setCredentials] = useState<RithmicCredentials>({
    username: '',
    password: '',
    server: 'PAPER',
    userId: user?.id || ''
  })
  const [accounts, setAccounts] = useState<RithmicAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [orders, setOrders] = useState<RithmicOrder[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<{ type: string; content: string }[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([])

  const addMessage = useCallback((message: string, type: string = 'log') => {
    setMessages(prev => [...prev, { type, content: message }])
    setFeedbackMessages(prev => [...prev, JSON.stringify({ type, message })])
  }, [])

  async function handleConnect(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`https://${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()
      console.log('Account response:', data)

      if (!data.success) {
        throw new Error(data.message)
      }

      setAccounts(data.accounts)
      setToken(data.token)
      setWsUrl(data.websocket_url.replace('ws://your-domain', 
        `${window.location.protocol === 'https:' ? 'wss:' : 'wss:'}//${process.env.NEXT_PUBLIC_API_URL}`))
      console.log('Token set:', data.token)
      console.log('WebSocket URL set:', data.websocket_url)
      setStep('select-accounts')
      addMessage(`Retrieved ${data.accounts.length} accounts. Please select accounts and click "Start Processing"`, 'accounts')
    } catch (error) {
      console.error('Connection error:', error)
      addMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
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

  function handleStartProcessing() {
    setIsLoading(true)
    setStep('processing')

    if (!token || !wsUrl) {
      addMessage('No token or WebSocket URL available. Please reconnect.', 'error')
      setIsLoading(false)
      return
    }

    // Add initial message for total accounts
    addMessage(JSON.stringify({
      type: 'init_stats',
      message: `Processing ${selectedAccounts.length} selected accounts`,
      total_accounts: selectedAccounts.length
    }))

    // Connect using the WebSocket context
    connect(wsUrl)
  }

  // Send init message when connection is established
  useEffect(() => {
    if (isConnected && step === 'processing') {
      const startDate = calculateStartDate(selectedAccounts)
      const message = { 
        type: 'init',
        token: token,
        accounts: selectedAccounts,
        start_date: startDate
      }
      console.log('Sending init message:', message)
      sendMessage(message)
    }
  }, [isConnected, step, token, selectedAccounts, sendMessage])

  // Listen for connection status changes
  useEffect(() => {
    if (isConnected) {
      addMessage(JSON.stringify({
        type: 'status',
        message: 'WebSocket connected'
      }))
    }
  }, [isConnected, addMessage])

  // Cleanup WebSocket on unmount or when going back to previous steps
  useEffect(() => {
    if (step !== 'processing' && isConnected) {
      disconnect()
    }
    return () => {
      disconnect()
    }
  }, [step, isConnected, disconnect])

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
            <Label htmlFor="rithmic-server">Rithmic Server</Label>
            <Select
              name="rithmic-server"
              value={credentials.server}
              onValueChange={(value) => setCredentials(prev => ({ ...prev, server: value }))}
            >
              <SelectTrigger id="rithmic-server">
                <SelectValue placeholder="Select Rithmic server" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAPER">Paper Trading</SelectItem>
                <SelectItem value="TEST">Test Environment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get Accounts
          </Button>
        </form>
      )}

      {step === 'select-accounts' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select Accounts to Import</h3>
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.account_id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                <Checkbox
                  id={account.account_id}
                  checked={selectedAccounts.includes(account.account_id)}
                  onCheckedChange={(checked) => {
                    setSelectedAccounts(prev => 
                      checked 
                        ? [...prev, account.account_id]
                        : prev.filter(id => id !== account.account_id)
                    )
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
            messages={feedbackMessages} 
            totalAccounts={selectedAccounts.length}
          />
        </div>
      )}
    </div>
  )
}

