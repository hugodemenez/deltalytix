'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from '@/hooks/use-toast'
import { TickDetails, Trade } from '@prisma/client'
import { getTickDetails } from '../../server/tick-details'

interface ContractSpec {
  tickSize: number;
  tickValue: number;
}


interface RithmicOrderProcessorProps {
  csvData: string[][]
  headers: string[]
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>
}

interface Order {
  quantity: number;
  price: number;
  commission: number;
  timestamp: string;
  orderId: string;
}

interface OpenPosition {
  accountNumber: string;
  quantity: number;
  instrument: string;
  side: 'Long' | 'Short';
  userId: string;
  entryOrders: Order[];
  exitOrders: Order[];
  averageEntryPrice: number;
  entryDate: string;
  totalCommission: number;
  originalQuantity: number;
}

export default function RithmicOrderProcessor({ csvData, headers, setProcessedTrades }: RithmicOrderProcessorProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [tickDetails, setTickDetails] = useState<TickDetails[]>([])
  
  useEffect(() => {
    const fetchTickDetails = async () => {
      const details = await getTickDetails()
      console.log(details)
      setTickDetails(details)
    }
    fetchTickDetails()
  }, [])

  const parsePrice = (priceString: string): number => {
    if (!priceString || typeof priceString !== 'string') {
      console.warn(`Invalid price string: ${priceString}`)
      return 0
    }
    
    if (priceString.includes('.')) {
      return parseFloat(priceString)
    }
    
    const [whole, fraction] = priceString.split("'")
    return parseInt(whole) + (fraction ? parseInt(fraction) / 32 : 0)
  }

  const calculatePnL = (entryOrders: Order[], exitOrders: Order[], contractSpec: ContractSpec, side: 'Long' | 'Short'): number => {
    const totalEntryQuantity = entryOrders.reduce((sum, order) => sum + order.quantity, 0)
    const totalExitQuantity = exitOrders.reduce((sum, order) => sum + order.quantity, 0)
    const quantity = Math.min(totalEntryQuantity, totalExitQuantity)

    const avgEntryPrice = entryOrders.reduce((sum, order) => sum + order.price * order.quantity, 0) / totalEntryQuantity
    const avgExitPrice = exitOrders.reduce((sum, order) => sum + order.price * order.quantity, 0) / totalExitQuantity

    const priceDifference = avgExitPrice - avgEntryPrice
    const ticks = priceDifference / contractSpec.tickSize
    const rawPnL = ticks * contractSpec.tickValue * quantity
    return side === 'Long' ? rawPnL : -rawPnL
  }

  const getHeaderIndex = useCallback((headerPattern: string): number => {
    return headers.findIndex(header => header.toLowerCase().includes(headerPattern.toLowerCase()))
  }, [headers])

  const processOrders = useCallback(() => {
    const processedTrades: Trade[] = []
    const openPositions: { [key: string]: OpenPosition } = {}

    // Sort orders by Update Time column in ascending order
    const sortedCsvData = csvData.sort((a, b) => {
      const timeIndex = getHeaderIndex('update time')
      if (timeIndex === -1) return 0
      return new Date(a[timeIndex]).getTime() - new Date(b[timeIndex]).getTime()
    })

    sortedCsvData.forEach((row) => {
      if (row.length !== headers.length) return // Skip invalid rows

      const order = headers.reduce((acc, header, index) => {
        acc[header] = row[index]
        return acc
      }, {} as Record<string, string>)

      const updateTimeHeader = headers.find(header => 
        header.toLowerCase().includes('update time')
      ) || ''

      const symbol = order["Symbol"].slice(0, -2)
      const quantity = parseInt(order["Qty Filled"])
      const price = parsePrice(order["Avg Fill Price"])
      const side = order["Buy/Sell"]
      const timestamp = order[updateTimeHeader]
      const commissionRate = parseFloat(order["Commission Fill Rate"])
      const orderCommission = commissionRate * quantity
      const orderId = order["Order Number"]

      const contractSpec = tickDetails.find(detail => detail.ticker === symbol) || { tickSize: 1/64, tickValue: 15.625 }

      const newOrder: Order = {
        quantity,
        price,
        commission: orderCommission,
        timestamp,
        orderId
      }

      if (openPositions[symbol]) {
        const openPosition = openPositions[symbol]
        
        if ((side === 'B' && openPosition.side === 'Short') || (side === 'S' && openPosition.side === 'Long')) {
          // Close or reduce position
          openPosition.exitOrders.push(newOrder)
          openPosition.quantity -= quantity
          openPosition.totalCommission += orderCommission

          if (openPosition.quantity <= 0) {
            // Close position
            const pnl = calculatePnL(openPosition.entryOrders, openPosition.exitOrders, contractSpec, openPosition.side)

            const trade: Trade = {
              id: `${openPosition.entryOrders.map(o => o.orderId).join('-')}-${openPosition.exitOrders.map(o => o.orderId).join('-')}`,
              accountNumber: openPosition.accountNumber,
              quantity: openPosition.originalQuantity,
              entryId: openPosition.entryOrders.map(o => o.orderId).join('-'),
              closeId: openPosition.exitOrders.map(o => o.orderId).join('-'),
              instrument: symbol,
              entryPrice: openPosition.averageEntryPrice.toFixed(5),
              closePrice: (openPosition.exitOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / 
                           openPosition.exitOrders.reduce((sum, o) => sum + o.quantity, 0)).toFixed(5),
              entryDate: openPosition.entryDate,
              closeDate: timestamp,
              pnl: pnl,
              timeInPosition: (new Date(timestamp).getTime() - new Date(openPosition.entryDate).getTime()) / 1000,
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
                accountNumber: order["Account"],
                quantity: -openPosition.quantity,
                instrument: symbol,
                side: side === 'B' ? 'Long' : 'Short',
                userId: openPosition.userId,
                entryOrders: [newOrder],
                exitOrders: [],
                averageEntryPrice: price,
                entryDate: timestamp,
                totalCommission: orderCommission,
                originalQuantity: -openPosition.quantity
              }
            } else {
              // Full close
              delete openPositions[symbol]
            }
          }
        } else {
          // Add to position
          openPosition.entryOrders.push(newOrder)
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
          accountNumber: order["Account"],
          quantity: quantity,
          instrument: symbol,
          side: side === 'B' ? 'Long' : 'Short',
          userId: '', // This should be set to the actual user ID
          entryOrders: [newOrder],
          exitOrders: [],
          averageEntryPrice: price,
          entryDate: timestamp,
          totalCommission: orderCommission,
          originalQuantity: quantity
        }
      }
    })

    // Close any remaining open positions
    Object.entries(openPositions).forEach(([symbol, position]) => {
      const lastTrade = csvData[csvData.length - 1]
      const lastPrice = parsePrice(lastTrade[headers.indexOf("Avg Fill Price")])
      const lastTimestamp = lastTrade[headers.indexOf("Update Time (RDT)")]
      const contractSpec = tickDetails.find(detail => detail.ticker === symbol) || { tickSize: 1/64, tickValue: 15.625 }

      const pnl = calculatePnL(position.entryOrders, [{...position.entryOrders[0], price: lastPrice}], contractSpec, position.side)

      const trade: Trade = {
        id: `${position.entryOrders.map(o => o.orderId).join('-')}-open`,
        accountNumber: position.accountNumber,
        quantity: position.originalQuantity,
        entryId: position.entryOrders.map(o => o.orderId).join('-'),
        closeId: null,
        instrument: symbol,
        entryPrice: position.averageEntryPrice.toFixed(5),
        closePrice: lastPrice.toFixed(5),
        entryDate: position.entryDate,
        closeDate: lastTimestamp,
        pnl: pnl,
        timeInPosition: (new Date(lastTimestamp).getTime() - new Date(position.entryDate).getTime()) / 1000,
        userId: position.userId,
        side: position.side,
        commission: position.totalCommission,
        createdAt: new Date(),
        comment: "Position still open"
      }

      processedTrades.push(trade)
    })

    setTrades(processedTrades)
    setProcessedTrades(processedTrades)
  }, [csvData, headers, setProcessedTrades, tickDetails, getHeaderIndex])

  useEffect(() => {
    processOrders()
  }, [processOrders])

  const uniqueSymbols = useMemo(() => Array.from(new Set(trades.map(trade => trade.instrument))), [trades])

  const tradedTickDetails = useMemo(() => 
    tickDetails.filter(detail => uniqueSymbols.includes(detail.ticker)),
    [tickDetails, uniqueSymbols]
  )

  const handleContractSpecChange = (symbol: string, field: keyof TickDetails, value: string) => {
    const updatedTickDetails = tickDetails.map(detail => {
      if (detail.ticker === symbol) {
        return {
          ...detail,
          [field]: parseFloat(value)
        }
      }
      return detail
    })
    setTickDetails(updatedTickDetails)
  }

  const totalPnL = useMemo(() => trades.reduce((sum, trade) => sum + trade.pnl, 0), [trades])
  const totalCommission = useMemo(() => trades.reduce((sum, trade) => sum + trade.commission, 0), [trades])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Contract Specifications</h3>
        <div className="grid grid-cols-3 gap-4">
          {tradedTickDetails.map((detail) => (
            <div key={detail.ticker} className="space-y-2">
              <h4 className="font-medium">{detail.ticker}</h4>
              <div className="flex items-center space-x-2">
                <label className="text-sm">Tick Size:</label>
                <Input
                  type="number"
                  value={detail.tickSize}
                  onChange={(e) => handleContractSpecChange(detail.ticker, 'tickSize', e.target.value)}
                  className="w-24"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm">Tick Value:</label>
                <Input
                  type="number"
                  value={detail.tickValue}
                  onChange={(e) => handleContractSpecChange(detail.ticker, 'tickValue', e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Processed Trades</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrument</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Close Price</TableHead>
              <TableHead>Entry Date</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Time in Position</TableHead>
              <TableHead>Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>{trade.instrument}</TableCell>
                <TableCell>{trade.side}</TableCell>
                <TableCell>{trade.quantity}</TableCell>
                <TableCell>{trade.entryPrice}</TableCell>
                <TableCell>{trade.closePrice || '-'}</TableCell>
                <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
                <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                <TableCell>{trade.pnl.toFixed(2)}</TableCell>
                <TableCell>{`${Math.floor(trade.timeInPosition / 60)}m ${Math.floor(trade.timeInPosition % 60)}s`}</TableCell>
                <TableCell>{trade.commission.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Total PnL</h3>
          <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnL.toFixed(2)}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Total Commission</h3>
          <p className="text-xl font-bold text-blue-600">
            {totalCommission.toFixed(2)}
          </p>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Instruments Traded</h3>
        <div className="flex flex-wrap gap-2">
          {uniqueSymbols.map((symbol) => (
            <Button
              key={symbol}
              variant="outline"
              onClick={() => toast({
                title: "Instrument Information",
                description: `You traded ${symbol}. For more details,
 please check the trades table.`
              })}
            >
              {symbol}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
