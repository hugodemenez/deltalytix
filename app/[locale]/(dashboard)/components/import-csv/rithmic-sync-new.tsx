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
      const response = await fetch(`${window.location.protocol}//${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
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
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${process.env.NEXT_PUBLIC_API_URL}`))
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

    console.log('Using WebSocket URL:', wsUrl)
    const newWs = new WebSocket(wsUrl)

    newWs.onopen = () => {
      console.log('WebSocket opened')
      addMessage('WebSocket connected', 'status')
      const startDate = calculateStartDate(selectedAccounts)
      const message = { 
        type: 'init',
        token: token,
        accounts: selectedAccounts,
        start_date: startDate
      }
      console.log('Sending init message:', message)
      newWs.send(JSON.stringify(message))
    }

    newWs.onmessage = (event) => {
      console.log('WebSocket message received:', event.data)
      try {
        const message = JSON.parse(event.data)
        let messageType = 'log'
        
        switch (message.type) {
          case 'order_update':
            messageType = 'order'
            setOrders(prev => [...prev, message.order])
            break
          case 'log':
            messageType = message.level === 'error' ? 'error' : 'log'
            break
          case 'status':
            messageType = 'status'
            break
        }
        
        addMessage(JSON.stringify(message), messageType)
      } catch (error) {
        console.error('Error parsing message:', error)
        addMessage(`Error parsing message: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      }
    }

    newWs.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      addMessage(`WebSocket disconnected (${event.code}: ${event.reason || 'No reason provided'})`, 'status')
      setIsLoading(false)
      setWs(null)  // Clear the WebSocket reference
    }

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error)
      addMessage(`WebSocket error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      setIsLoading(false)
    }

    setWs(newWs)
  }

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [ws])

  return (
    <div className="space-y-6">
      {step === 'credentials' && (
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server">Server</Label>
            <Input 
              id="server" 
              value={credentials.server}
              onChange={(e) => setCredentials(prev => ({ ...prev, server: e.target.value }))}
              required 
            />
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
          <RithmicSyncFeedback messages={feedbackMessages} />
          {/* <div className="rounded-md border max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={`${order.order_id}-${index}`}>
                    <TableCell>{new Date(order.timestamp * 1000).toLocaleString()}</TableCell>
                    <TableCell>{order.order_id}</TableCell>
                    <TableCell>{order.account_id}</TableCell>
                    <TableCell>{order.ticker}</TableCell>
                    <TableCell>{order.buy_sell_type}</TableCell>
                    <TableCell>{order.order_type}</TableCell>
                    <TableCell className="text-right">{order.filled_quantity}</TableCell>
                    <TableCell className="text-right">{order.price.toFixed(3)}</TableCell>
                    <TableCell className="text-right">{order.commission.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div> */}
        </div>
      )}
    </div>
  )
}

