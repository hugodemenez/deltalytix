'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from '@/hooks/use-toast'
import { Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { TickDetails, Trade } from '@prisma/client'
import { getTickDetails } from '@/server/tick-details'
import { saveTrades } from '@/server/database'
import { useUser } from '@/components/context/user-data'
import { useTrades } from '@/components/context/trades-data'
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { connectToRithmic } from '@/server/rithmic'
import { fetchRithmicOrders } from '@/server/rithmic'

const RITHMIC_GATEWAYS = [
  { id: 'test', name: 'Rithmic Test' },
  { id: 'r01', name: 'Rithmic 01' },
  { id: 'r04', name: 'Rithmic 04 Colo' },
  { id: 'paper', name: 'Rithmic Paper Trading' },
] as const

interface RithmicCredentials {
  gateway: typeof RITHMIC_GATEWAYS[number]['id']
  username: string
  password: string
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

interface RithmicApiResponse {
  orders: RithmicOrder[]
}

interface RithmicSyncProps {
  onSync: (data: { credentials: RithmicCredentials, orders: Record<string, any>[] }) => Promise<void>
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

interface Order {
  quantity: number
  price: number
  commission: number
  timestamp: string
  orderId: string
}

interface OpenPosition {
  accountNumber: string
  quantity: number
  instrument: string
  side: 'Long' | 'Short'
  userId: string
  entryOrders: Order[]
  exitOrders: Order[]
  averageEntryPrice: number
  entryDate: string
  totalCommission: number
  originalQuantity: number
}

interface RithmicAccount {
  id: string
  name: string
  type: string
}

interface ExpandedTradeDetails {
  tradeId: string
  entryOrders: Order[]
  exitOrders: Order[]
}

interface QueuedOrder extends Order {
  side: 'Long' | 'Short'
  remaining: number
}

const generateTradeHash = (
  userId: string,
  accountNumber: string,
  instrument: string,
  entryDate: string,
  closeDate: string,
  quantity: number,
  entryId: string,
  closeId: string,
  timeInPosition: number,
  lotIndex: number
): string => {
  return `${userId}-${accountNumber}-${instrument}-${entryDate}-${closeDate}-${quantity}-${entryId}-${closeId}-${timeInPosition}-lot${lotIndex}`
}

export function RithmicSync({ onSync, setIsOpen }: RithmicSyncProps) {
  const { user } = useUser()
  const { refreshTrades } = useTrades()
  const [step, setStep] = useState<'credentials' | 'select-accounts' | 'processing' | 'review-orders' | 'review-trades'>('credentials')
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<RithmicAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [credentials, setCredentials] = useState<RithmicCredentials>({
    gateway: 'paper',
    username: '',
    password: '',
  })
  const [tickDetails, setTickDetails] = useState<TickDetails[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [incompleteTrades, setIncompleteTrades] = useState<OpenPosition[]>([])
  const [rawOrders, setRawOrders] = useState<RithmicOrder[]>([])
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)

  useEffect(() => {
    const fetchTickDetails = async () => {
      const details = await getTickDetails()
      setTickDetails(details)
    }
    fetchTickDetails()
  }, [])

  const processOrders = useCallback(async (orders: RithmicOrder[]) => {
    if (!user) return []

    const processedTrades: Trade[] = []
    const positionsByAccount: Record<string, { 
      [instrumentKey: string]: {
        queue: QueuedOrder[]
        side: 'Long' | 'Short'
      } 
    }> = {}

    // Group and sort orders by account
    const ordersByAccount = orders.reduce((acc, order) => {
      if (!acc[order.account_id]) acc[order.account_id] = []
      acc[order.account_id].push(order)
      return acc
    }, {} as Record<string, RithmicOrder[]>)

    for (const accountId of Object.keys(ordersByAccount)) {
      const accountOrders = ordersByAccount[accountId]
      positionsByAccount[accountId] = {}

      // Sort orders by timestamp
      const sortedOrders = [...accountOrders].sort((a, b) => 
        new Date(a.timestamp * 1000).getTime() - new Date(b.timestamp * 1000).getTime()
      )

      for (const order of sortedOrders) {
        const isBuy = order.buy_sell_type === 'B'
        const instrumentKey = order.ticker
        const orderSide = isBuy ? 'Long' : 'Short'

        // Split order into individual lot orders
        const lotOrders = Array(order.filled_quantity).fill(null).map(() => ({
          quantity: 1,
          price: order.price,
          commission: order.commission / order.filled_quantity,
          timestamp: new Date(order.timestamp * 1000).toISOString(),
          orderId: order.order_id,
          side: orderSide as 'Long' | 'Short',
          remaining: 1
        })) as QueuedOrder[]

        for (const lotOrder of lotOrders) {
          if (!positionsByAccount[accountId][instrumentKey]) {
            // Start new position
            positionsByAccount[accountId][instrumentKey] = {
              queue: [lotOrder],
              side: orderSide
            }
            continue
          }

          const position = positionsByAccount[accountId][instrumentKey]
          const isReducing = position.side !== orderSide

          if (isReducing) {
            // Process reducing orders
            while (lotOrder.remaining > 0 && position.queue.length > 0) {
              const matchingOrder = position.queue[position.queue.length - 1]
              const lotIndex = position.queue.length - 1
              
              // Create trade for this match
              const trade = createTrade(
                user.id,
                accountId,
                instrumentKey,
                position.side,
                matchingOrder,
                lotOrder,
                lotIndex
              )
              processedTrades.push(trade)

              // Remove matched order from queue
              position.queue.pop()
              lotOrder.remaining--
            }

            // If queue is empty, start new position in opposite direction
            if (position.queue.length === 0 && lotOrder.remaining > 0) {
              position.queue = [lotOrder]
              position.side = orderSide
            }
          } else {
            // Add to existing position
            position.queue.push(lotOrder)
          }
        }
      }
    }

    return processedTrades
  }, [user])

  function createTrade(
    userId: string,
    accountId: string,
    instrument: string,
    side: 'Long' | 'Short',
    entryOrder: QueuedOrder,
    exitOrder: QueuedOrder,
    lotIndex: number
  ): Trade {
    const timeInPosition = Math.floor(
      (new Date(exitOrder.timestamp).getTime() - new Date(entryOrder.timestamp).getTime()) / 1000
    )

    return {
      id: generateTradeHash(
        userId,
        accountId,
        instrument,
        entryOrder.timestamp,
        exitOrder.timestamp,
        1,
        entryOrder.orderId,
        exitOrder.orderId,
        timeInPosition,
        lotIndex
      ),
      userId,
      accountNumber: accountId,
      instrument,
      quantity: 1,
      entryPrice: entryOrder.price.toString(),
      closePrice: exitOrder.price.toString(),
      entryDate: entryOrder.timestamp,
      closeDate: exitOrder.timestamp,
      side,
      commission: entryOrder.commission + exitOrder.commission,
      timeInPosition,
      pnl: calculatePnL(side, 1, entryOrder.price, exitOrder.price, instrument),
      entryId: entryOrder.orderId,
      closeId: exitOrder.orderId,
      comment: null,
      createdAt: new Date()
    }
  }

  // Add helper function for PnL calculation
  function calculatePnL(
    side: 'Long' | 'Short', 
    quantity: number, 
    entryPrice: number, 
    exitPrice: number,
    ticker: string
  ): number {
    const contractSpec = tickDetails.find(detail => detail.ticker === ticker) || { 
      tickSize: 1/64,
      tickValue: 15.625
    }

    // Don't round intermediate calculations
    const priceDifference = exitPrice - entryPrice
    const ticks = Math.round(priceDifference / contractSpec.tickSize)
    const rawPnL = ticks * contractSpec.tickValue * quantity
    
    console.error(ticks, rawPnL, quantity, contractSpec.tickSize, contractSpec.tickValue)
    // Only round the final result
    return Number((side === 'Long' ? rawPnL : -rawPnL).toFixed(2))
  }

  async function handleConnect(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const result = await connectToRithmic({
        username: credentials.username,
        password: credentials.password,
        gateway: credentials.gateway as 'test' | 'paper' | 'r01' | 'r04'
      })

      setAccounts(result.accounts)
      toast({
        title: "Connection Successful",
        description: `Found ${result.accounts.length} account${result.accounts.length === 1 ? '' : 's'}`,
      })
      setStep('select-accounts')
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Rithmic. Please verify your credentials.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFetchOrders() {
    setIsLoading(true)
    setStep('processing')

    try {
      const result = await fetchRithmicOrders({
        credentials,
        accounts: selectedAccounts,
      })

      if (!result.orders || result.orders.length === 0) {
        toast({
          title: "No Orders Found",
          description: `Processed ${result.accounts_processed} account(s), but no orders were found.`,
          variant: "default",
        })
        setIsOpen(false)
        return
      }

      setRawOrders(result.orders)
      setStep('review-orders')
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import trades",
        variant: "destructive",
      })
      setStep('select-accounts')
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownloadOrders() {
    const dataStr = JSON.stringify(rawOrders, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'rithmic-orders.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleProcessOrders() {
    setIsLoading(true)
    setStep('processing')
    try {
      const processedTrades = await processOrders(rawOrders)
      setTrades(processedTrades)
      setStep('review-trades')
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process orders into trades",
        variant: "destructive",
      })
      setStep('review-orders')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveTrades() {
    setIsLoading(true)
    try {
      await saveTrades(trades)
      await onSync({ 
        credentials,
        orders: trades 
      })
      
      toast({
        title: "Import Successful",
        description: `Saved ${trades.length} trades successfully.`,
      })
      
      setIsOpen(false)
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save trades",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function OrderDetailsRow({ orders, type }: { orders: Order[], type: 'Entry' | 'Exit' }) {
    return (
      <TableRow className="bg-muted/50">
        <TableCell colSpan={7}>
          <div className="py-2">
            <div className="font-medium text-sm mb-2">{type} Orders:</div>
            <div className="space-y-1">
              {orders.map((order, index) => (
                <div key={order.orderId} className="text-sm grid grid-cols-5 gap-4">
                  <div>Order ID: {order.orderId}</div>
                  <div>Time: {new Date(order.timestamp).toLocaleString()}</div>
                  <div>Quantity: {order.quantity}</div>
                  <div>Price: {order.price.toFixed(3)}</div>
                  <div>Commission: ${order.commission.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p>Please log in to sync your Rithmic account.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {step === 'credentials' && (
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gateway">Gateway</Label>
            <Select 
              value={credentials.gateway} 
              onValueChange={(value) => setCredentials(prev => ({ 
                ...prev, 
                gateway: value as typeof RITHMIC_GATEWAYS[number]['id']
              }))}
            >
              <SelectTrigger id="gateway">
                <SelectValue placeholder="Select a gateway" />
              </SelectTrigger>
              <SelectContent>
                {RITHMIC_GATEWAYS.map((gw) => (
                  <SelectItem key={gw.id} value={gw.id}>
                    {gw.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect to Gateway
          </Button>
        </form>
      )}

      {step === 'select-accounts' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select Accounts to Import</h3>
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                <Checkbox
                  id={account.id}
                  checked={selectedAccounts.includes(account.id)}
                  onCheckedChange={(checked) => {
                    setSelectedAccounts(prev => 
                      checked 
                        ? [...prev, account.id]
                        : prev.filter(id => id !== account.id)
                    )
                  }}
                />
                <Label 
                  htmlFor={account.id}
                  className="flex-1 cursor-pointer"
                >
                  {account.name} 
                  <span className="text-sm text-muted-foreground ml-2">
                    ({account.type})
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
              onClick={handleFetchOrders}
              disabled={isLoading || selectedAccounts.length === 0}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {selectedAccounts.length} Account{selectedAccounts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {step === 'review-orders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Review Raw Orders</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadOrders}
            >
              Download JSON
            </Button>
          </div>
          <div className="rounded-md border max-h-[300px] overflow-y-auto">
            <div className="overflow-x-auto">
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
                  {rawOrders.map((order) => (
                    <TableRow key={order.order_id}>
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
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep('select-accounts')}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={handleProcessOrders}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Orders into Trades'
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'review-trades' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Review Computed Trades</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {Object.entries(
              trades.reduce((acc, trade) => {
                if (!acc[trade.accountNumber]) {
                  acc[trade.accountNumber] = []
                }
                acc[trade.accountNumber].push(trade)
                return acc
              }, {} as Record<string, Trade[]>)
            ).map(([accountNumber, accountTrades]) => (
              <div key={accountNumber} className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-2">
                  Account: {accountNumber}
                </h4>
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30px]"></TableHead>
                          <TableHead>Instrument</TableHead>
                          <TableHead>Side</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Entry Date</TableHead>
                          <TableHead className="text-right">Entry Price</TableHead>
                          <TableHead>Exit Date</TableHead>
                          <TableHead className="text-right">Exit Price</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">P&L</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountTrades.map((trade) => (
                          <>
                            <TableRow 
                              key={trade.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
                            >
                              <TableCell>
                                {expandedTrade === trade.id ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell>{trade.instrument}</TableCell>
                              <TableCell>{trade.side}</TableCell>
                              <TableCell>{trade.quantity}</TableCell>
                              <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
                              <TableCell className="text-right">{Number(trade.entryPrice).toFixed(3)}</TableCell>
                              <TableCell>{new Date(trade.closeDate).toLocaleString()}</TableCell>
                              <TableCell className="text-right">{Number(trade.closePrice).toFixed(3)}</TableCell>
                              <TableCell className="text-right">{trade.commission.toFixed(2)}</TableCell>
                              <TableCell className={cn(
                                "text-right font-medium",
                                trade.pnl > 0 ? "text-green-600" : trade.pnl < 0 ? "text-red-600" : ""
                              )}>
                                {Number(trade.pnl).toFixed(2)}
                                <span className="text-muted-foreground text-sm ml-1">
                                  ({Number(trade.pnl - trade.commission).toFixed(2)} net)
                                </span>
                              </TableCell>
                            </TableRow>
                            {expandedTrade === trade.id && (
                              <>
                                <OrderDetailsRow 
                                  orders={rawOrders
                                    .filter(o => trade.entryId?.split(',').includes(o.order_id) ?? false)
                                    .map(o => ({
                                      quantity: o.filled_quantity,
                                      price: o.price,
                                      commission: o.commission,
                                      timestamp: new Date(o.timestamp * 1000).toISOString(),
                                      orderId: o.order_id
                                    }))} 
                                  type="Entry" 
                                />
                                <OrderDetailsRow 
                                  orders={rawOrders
                                    .filter(o => trade.closeId?.split(',').includes(o.order_id) ?? false)
                                    .map(o => ({
                                      quantity: o.filled_quantity,
                                      price: o.price,
                                      commission: o.commission,
                                      timestamp: new Date(o.timestamp * 1000).toISOString(),
                                      orderId: o.order_id
                                    }))} 
                                  type="Exit" 
                                />
                              </>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep('select-accounts')}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={handleSaveTrades}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${trades.length} Trades`
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="text-center space-y-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p>Processing your trades...</p>
        </div>
      )}
    </div>
  )
} 