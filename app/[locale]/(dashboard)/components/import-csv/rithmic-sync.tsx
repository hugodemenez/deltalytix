'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from '@/hooks/use-toast'
import { Loader2, AlertCircle } from 'lucide-react'
import { TickDetails, Trade } from '@prisma/client'
import { getTickDetails } from '@/server/tick-details'
import { saveTrades } from '@/server/database'
import { useUser } from '@/components/context/user-data'
import { useTrades } from '@/components/context/trades-data'

const RITHMIC_GATEWAYS = [
  { id: 'test', name: 'Rithmic Test' },
  { id: 'r01', name: 'Rithmic 01' },
  { id: 'r04', name: 'Rithmic 04 Colo' },
  { id: 'paper', name: 'Rithmic Paper Trading' },
] as const

interface RithmicCredentials {
  gateway: string
  username: string
  password: string
}

interface RithmicOrder {
  order_id: string
  account_id: string
  ticker: string
  exchange: string
  order_type: string
  buy_sell_type: string
  status: string
  quantity: number
  filled_quantity: number
  price: number
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

const generateTradeHash = (
  userId: string,
  accountNumber: string,
  instrument: string,
  entryDate: string,
  closeDate: string,
  quantity: number,
  entryId: string,
  closeId: string,
  timeInPosition: number
): string => {
  return `${userId}-${accountNumber}-${instrument}-${entryDate}-${closeDate}-${quantity}-${entryId}-${closeId}-${timeInPosition}`
}

export function RithmicSync({ onSync, setIsOpen }: RithmicSyncProps) {
  const { user } = useUser()
  const { refreshTrades } = useTrades()
  const [isLoading, setIsLoading] = useState(false)
  const [trades, setTrades] = useState<Trade[]>([])
  const [tickDetails, setTickDetails] = useState<TickDetails[]>([])
  const [incompleteTrades, setIncompleteTrades] = useState<OpenPosition[]>([])
  const [formData, setFormData] = useState<RithmicCredentials>({
    gateway: 'test',
    username: '',
    password: '',
  })

  useEffect(() => {
    const fetchTickDetails = async () => {
      const details = await getTickDetails()
      setTickDetails(details)
    }
    fetchTickDetails()
  }, [])

  const processOrders = useCallback(async (orders: RithmicOrder[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    const processedTrades: Trade[] = []
    const incompleteTradesArray: OpenPosition[] = []

    // Group orders by account_id
    const ordersByAccount = orders.reduce((acc, order) => {
      if (!acc[order.account_id]) {
        acc[order.account_id] = []
      }
      acc[order.account_id].push(order)
      return acc
    }, {} as Record<string, RithmicOrder[]>)

    // Process each account's orders separately
    for (const accountId of Object.keys(ordersByAccount)) {
      const openPositions: { [key: string]: OpenPosition } = {}
      
      // Sort orders by timestamp and filter out unfilled orders
      const sortedOrders = ordersByAccount[accountId]
        .filter(order => order.filled_quantity > 0)
        .sort((a, b) => a.timestamp - b.timestamp)

      sortedOrders.forEach((rithmicOrder) => {
        const symbol = rithmicOrder.ticker.slice(0, -2)
        const quantity = rithmicOrder.filled_quantity
        const price = rithmicOrder.price
        const side = rithmicOrder.buy_sell_type
        const timestamp = new Date(rithmicOrder.timestamp * 1000).toISOString()
        const orderCommission = quantity * 1.5 // Default commission rate
        const orderId = rithmicOrder.order_id

        const order: Order = {
          quantity,
          price,
          commission: orderCommission,
          timestamp,
          orderId
        }

        const contractSpec = tickDetails.find(detail => detail.ticker === symbol) || 
          { tickSize: 1/64, tickValue: 15.625 }

        if (openPositions[symbol]) {
          const openPosition = openPositions[symbol]
          
          if ((side === 'B' && openPosition.side === 'Short') || 
              (side === 'S' && openPosition.side === 'Long')) {
            // Close or reduce position
            openPosition.exitOrders.push(order)
            openPosition.quantity -= quantity
            openPosition.totalCommission += orderCommission

            if (openPosition.quantity <= 0) {
              // Calculate PnL
              const totalEntryQuantity = openPosition.entryOrders.reduce((sum, o) => sum + o.quantity, 0)
              const totalExitQuantity = openPosition.exitOrders.reduce((sum, o) => sum + o.quantity, 0)
              const avgEntryPrice = openPosition.entryOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / totalEntryQuantity
              const avgExitPrice = openPosition.exitOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / totalExitQuantity
              
              const priceDifference = avgExitPrice - avgEntryPrice
              const ticks = priceDifference / contractSpec.tickSize
              const pnl = openPosition.side === 'Long' ? 
                ticks * contractSpec.tickValue * openPosition.originalQuantity :
                -ticks * contractSpec.tickValue * openPosition.originalQuantity

              const entryId = openPosition.entryOrders.map(o => o.orderId).join('-')
              const closeId = openPosition.exitOrders.map(o => o.orderId).join('-')
              const timeInPosition = (new Date(timestamp).getTime() - new Date(openPosition.entryDate).getTime()) / 1000

              const trade: Trade = {
                id: generateTradeHash(
                  user.id,
                  openPosition.accountNumber,
                  symbol,
                  openPosition.entryDate,
                  timestamp,
                  openPosition.originalQuantity,
                  entryId,
                  closeId,
                  timeInPosition
                ),
                accountNumber: openPosition.accountNumber,
                quantity: openPosition.originalQuantity,
                entryId,
                closeId,
                instrument: symbol,
                entryPrice: avgEntryPrice.toFixed(5),
                closePrice: avgExitPrice.toFixed(5),
                entryDate: openPosition.entryDate,
                closeDate: timestamp,
                pnl,
                timeInPosition,
                userId: openPosition.userId,
                side: openPosition.side,
                commission: openPosition.totalCommission,
                createdAt: new Date(),
                comment: null
              }

              processedTrades.push(trade)

              if (openPosition.quantity < 0) {
                // Reverse position
                openPositions[symbol] = {
                  accountNumber: rithmicOrder.account_id,
                  quantity: -openPosition.quantity,
                  instrument: symbol,
                  side: side === 'B' ? 'Long' : 'Short',
                  userId: openPosition.userId,
                  entryOrders: [order],
                  exitOrders: [],
                  averageEntryPrice: price,
                  entryDate: timestamp,
                  totalCommission: orderCommission,
                  originalQuantity: -openPosition.quantity
                }
              } else {
                delete openPositions[symbol]
              }
            }
          } else {
            // Add to position
            openPosition.entryOrders.push(order)
            const newQuantity = openPosition.quantity + quantity
            const newAverageEntryPrice = (openPosition.averageEntryPrice * openPosition.quantity + price * quantity) / newQuantity
            openPosition.quantity = newQuantity
            openPosition.originalQuantity = newQuantity
            openPosition.averageEntryPrice = newAverageEntryPrice
            openPosition.totalCommission += orderCommission
          }
        } else {
          // Open new position
          openPositions[symbol] = {
            accountNumber: rithmicOrder.account_id,
            quantity,
            instrument: symbol,
            side: side === 'B' ? 'Long' : 'Short',
            userId: user.id,
            entryOrders: [order],
            exitOrders: [],
            averageEntryPrice: price,
            entryDate: timestamp,
            totalCommission: orderCommission,
            originalQuantity: quantity
          }
        }
      })

      // Add any remaining open positions to incompleteTrades
      Object.values(openPositions).forEach((position) => {
        incompleteTradesArray.push(position)
      })
    }

    setTrades(processedTrades)
    setIncompleteTrades(incompleteTradesArray)

    if (incompleteTradesArray.length > 0) {
      toast({
        title: "Incomplete Trades Detected",
        description: `${incompleteTradesArray.length} trade(s) were not completed.`,
        variant: "default",
      })
    }

    await saveTrades(processedTrades)
    await refreshTrades()
    return processedTrades
  }, [tickDetails, user, refreshTrades])

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p>Please log in to sync your Rithmic account.</p>
      </div>
    )
  }

  async function handleSync(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/rithmic/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data: RithmicApiResponse = await response.json()

      if (!response.ok) {
        throw new Error('Connection failed')
      }

      if (data.orders) {
        const processedTrades = await processOrders(data.orders)
        await onSync({ 
          credentials: formData,
          orders: data.orders 
        })
        
        toast({
          title: "Connection Successful",
          description: `Successfully processed ${processedTrades.length} trades from ${data.orders.length} orders.`,
          duration: 5000,
        })
        
        setIsOpen(false)
      } else {
        throw new Error('Failed to retrieve orders')
      }
    } catch (error) {
      const handleSupportRequest = async () => {
        try {
          // Get Discord data from raw_user_meta_data
          const discordData = user?.user_metadata
          
          const supportData = {
            username: formData.username,
            gateway: formData.gateway,
            error: error instanceof Error ? error.message : "Failed to connect to Rithmic account",
            userId: user?.id || 'unknown',
            userEmail: user?.email || 'no email provided',
            discordId: discordData?.sub || null,
            discordUsername: discordData?.name || null
          }

          const response = await fetch('/api/discord/webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(supportData),
          })

          if (!response.ok) {
            throw new Error('Failed to send support request')
          }

          toast({
            title: "Support Request Sent",
            description: discordData?.sub 
              ? "Our team will contact you through Discord shortly."
              : `Our team will contact you at ${user?.email} shortly.`,
            duration: 5000,
          })
        } catch (supportError) {
          toast({
            title: "Failed to Send Support Request",
            description: "Please try again later or contact support directly.",
            variant: "destructive",
            duration: 5000,
          })
        }
      }

      toast({
        title: "Connection Failed",
        description: (
          <div className="flex flex-col gap-2">
            <p>{error instanceof Error ? error.message : "Failed to connect to Rithmic account"}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSupportRequest}
              className="flex items-center gap-2 w-fit"
            >
              <AlertCircle className="h-4 w-4" />
              Contact Support
            </Button>
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSync} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gateway">Gateway</Label>
          <Select 
            value={formData.gateway} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, gateway: value }))}
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
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required 
          />
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Connect Rithmic Account
        </Button>
      </form>
    </div>
  )
} 