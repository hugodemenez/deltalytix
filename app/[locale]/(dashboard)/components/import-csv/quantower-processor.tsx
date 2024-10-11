'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'
import { Input } from "@/components/ui/input"

interface ContractSpec {
  tickSize: number;
  tickValue: number;
}

const defaultContractSpecs: { [key: string]: ContractSpec } = {
  NQ: { tickSize: 0.25, tickValue: 5 },
  YM: { tickSize: 1, tickValue: 5 },
  MYM: { tickSize: 1, tickValue: 0.5 },
  MNQ: { tickSize: 0.25, tickValue: 0.5 },
  ES: { tickSize: 0.25, tickValue: 12.50 },
  MES: { tickSize: 0.25, tickValue: 1.25 },
  ZN: { tickSize: 1/64, tickValue: 15.625 },
  ZB: { tickSize: 1/32, tickValue: 31.25 },
  GC: { tickSize: 0.10, tickValue: 10.00 },
  SI: { tickSize: 0.005, tickValue: 25.00 },
}

interface QuantowerOrderProcessorProps {
  csvData: string[][]
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
  side: 'long' | 'short';
  userId: string;
  entryOrders: Order[];
  exitOrders: Order[];
  averageEntryPrice: number;
  entryDate: string;
  totalCommission: number;
  originalQuantity: number;
  openingOrderDetails?: string;
}

export default function QuantowerOrderProcessor({ csvData, setProcessedTrades }: QuantowerOrderProcessorProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [contractSpecs, setContractSpecs] = useState<{ [key: string]: ContractSpec }>(defaultContractSpecs)
  const [incompleteTrades, setIncompleteTrades] = useState<OpenPosition[]>([])
  const [unknownSymbols, setUnknownSymbols] = useState<string[]>([])

  const calculatePnL = (entryOrders: Order[], exitOrders: Order[], contractSpec: ContractSpec, side: 'long' | 'short'): number => {
    const totalEntryQuantity = entryOrders.reduce((sum, order) => sum + order.quantity, 0)
    const totalExitQuantity = exitOrders.reduce((sum, order) => sum + order.quantity, 0)
    const quantity = Math.min(totalEntryQuantity, totalExitQuantity)

    const avgEntryPrice = entryOrders.reduce((sum, order) => sum + order.price * order.quantity, 0) / totalEntryQuantity
    const avgExitPrice = exitOrders.reduce((sum, order) => sum + order.price * order.quantity, 0) / totalExitQuantity

    const priceDifference = avgExitPrice - avgEntryPrice
    const ticks = priceDifference / contractSpec.tickSize
    const rawPnL = ticks * contractSpec.tickValue * quantity
    return side === 'long' ? rawPnL : -rawPnL
  }

  const processOrders = useCallback(() => {
    const processedTrades: Trade[] = []
    const openPositions: { [key: string]: OpenPosition } = {}
    const incompleteTradesArray: OpenPosition[] = []
    const unknownSymbolsSet = new Set<string>()

    // Sort orders by Date/Time column in ascending order
    const sortedCsvData = csvData.sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime());

    sortedCsvData.forEach((row) => {
      const [account, dateTime, symbol, description, symbolType, expirationDate, strikePrice, side, orderType, quantity, price, grossPnL, fee, netPnL, tradeValue, tradeId, orderId, positionId] = row;

      if (!symbol) {
        console.error('Invalid row: symbol is undefined', row);
        return; // Skip this row
      }

      const symbolKey = symbol.slice(0, -2);
      if (!(symbolKey in contractSpecs)) {
        unknownSymbolsSet.add(symbolKey);
        contractSpecs[symbolKey] = { tickSize: 0.25, tickValue: 5 }; // Default values
      }

      const contractSpec = contractSpecs[symbolKey];

      const newOrder: Order = {
        quantity: Math.abs(parseFloat(quantity)),
        price: parseFloat(price),
        commission: parseFloat(fee),
        timestamp: dateTime,
        orderId
      }

      if (openPositions[symbol]) {
        const openPosition = openPositions[symbol]
        
        if ((side === 'Buy' && openPosition.side === 'short') || (side === 'Sell' && openPosition.side === 'long')) {
          // Close or reduce position
          openPosition.exitOrders.push(newOrder)
          openPosition.quantity -= newOrder.quantity
          openPosition.totalCommission += newOrder.commission

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
              entryPrice: openPosition.averageEntryPrice.toFixed(2),
              closePrice: (openPosition.exitOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / 
                           openPosition.exitOrders.reduce((sum, o) => sum + o.quantity, 0)).toFixed(2),
              entryDate: openPosition.entryDate,
              closeDate: dateTime,
              pnl: pnl,
              timeInPosition: (new Date(dateTime).getTime() - new Date(openPosition.entryDate).getTime()) / 1000,
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
                accountNumber: account,
                quantity: -openPosition.quantity,
                instrument: symbol,
                side: side === 'Buy' ? 'long' : 'short',
                userId: openPosition.userId,
                entryOrders: [newOrder],
                exitOrders: [],
                averageEntryPrice: newOrder.price,
                entryDate: dateTime,
                totalCommission: newOrder.commission,
                originalQuantity: -openPosition.quantity,
                openingOrderDetails: `${side} ${quantity} @ ${price}`
              }
            } else {
              // Full close
              delete openPositions[symbol]
            }
          }
        } else {
          // Add to position
          openPosition.entryOrders.push(newOrder)
          const newQuantity = openPosition.quantity + newOrder.quantity
          const newAverageEntryPrice = (openPosition.averageEntryPrice * openPosition.quantity + newOrder.price * newOrder.quantity) / newQuantity
          openPosition.quantity = newQuantity
          openPosition.originalQuantity = newQuantity
          openPosition.averageEntryPrice = newAverageEntryPrice
          openPosition.totalCommission += newOrder.commission
        }
      } else {
        // Open new position
        openPositions[symbol] = {
          accountNumber: account,
          quantity: newOrder.quantity,
          instrument: symbol,
          side: side === 'Buy' ? 'long' : 'short',
          userId: '', // This should be set to the actual user ID
          entryOrders: [newOrder],
          exitOrders: [],
          averageEntryPrice: newOrder.price,
          entryDate: dateTime,
          totalCommission: newOrder.commission,
          originalQuantity: newOrder.quantity,
          openingOrderDetails: `${side} ${quantity} @ ${price}`
        }
      }
    })

    // Handle remaining open positions
    Object.entries(openPositions).forEach(([symbol, position]) => {
      incompleteTradesArray.push(position)
    })

    setTrades(processedTrades)
    setProcessedTrades(processedTrades)
    setIncompleteTrades(incompleteTradesArray)

    if (incompleteTradesArray.length > 0) {
      toast({
        title: "Incomplete Trades Detected",
        description: `${incompleteTradesArray.length} trade(s) were not completed and have been removed from the analysis.`,
        variant: "default",
      })
    }

    setUnknownSymbols(Array.from(unknownSymbolsSet));
  }, [csvData, setProcessedTrades, contractSpecs])

  useEffect(() => {
    processOrders()
  }, [processOrders])

  const uniqueSymbols = useMemo(() => Array.from(new Set(trades.map(trade => trade.instrument))), [trades])

  const totalPnL = useMemo(() => trades.reduce((sum, trade) => sum + trade.pnl, 0), [trades])
  const totalCommission = useMemo(() => trades.reduce((sum, trade) => sum + trade.commission, 0), [trades])

  const handleContractSpecChange = (symbol: string, field: keyof ContractSpec, value: string) => {
    setContractSpecs(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        [field]: parseFloat(value)
      }
    }))
  }

  return (
    <div className="space-y-4">
      {incompleteTrades.length > 0 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p className="font-bold">Incomplete Trades Detected</p>
          <p>{`${incompleteTrades.length} trade(s) were not completed and have been removed from the analysis.`}</p>
          <ul className="list-disc list-inside mt-2">
            {incompleteTrades.map((trade, index) => (
              <li key={index}>
                {`${trade.instrument}: ${trade.side} ${trade.quantity} @ ${trade.averageEntryPrice.toFixed(2)} (Opened on ${new Date(trade.entryDate).toLocaleString()})`}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {unknownSymbols.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Unknown Contract Specifications</h3>
          <div className="grid grid-cols-3 gap-4">
            {unknownSymbols.map((symbol) => (
              <div key={symbol} className="space-y-2">
                <h4 className="font-medium">{symbol}</h4>
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Tick Size:</label>
                  <Input
                    type="number"
                    value={contractSpecs[symbol].tickSize}
                    onChange={(e) => handleContractSpecChange(symbol, 'tickSize', e.target.value)}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Tick Value:</label>
                  <Input
                    type="number"
                    value={contractSpecs[symbol].tickValue}
                    onChange={(e) => handleContractSpecChange(symbol, 'tickValue', e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
                description: `You traded ${symbol}. For more details, please check the trades table.`
              })}
            >
              {symbol || 'Unknown'}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}