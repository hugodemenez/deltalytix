'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { TickDetails, Trade } from '@/prisma/generated/prisma/browser'
import { getTickDetails } from '@/server/tick-details'
import { PlatformProcessorProps } from '../config/platforms'

interface ContractSpec {
  tickSize: number;
  tickValue: number;
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

interface IncompleteTrade extends OpenPosition {
  openingOrderDetails: string;
}

function parseDate(dateString: string): Date {
  if (!dateString) return new Date()
  
  // Try DD/MM/YYYY HH:mm format
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/
  const ddmmyyyyMatch = dateString.match(ddmmyyyy)
  if (ddmmyyyyMatch) {
    const [_, day, month, year, hours, minutes] = ddmmyyyyMatch
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // months are 0-based
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    )
  }

  // Fallback to standard date parsing
  const parsedDate = new Date(dateString)
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate
  }

  console.warn(`Unable to parse date: ${dateString}`)
  return new Date()
}

function cleanCsvData(csvData: string[][], headers: string[]): [string[][], string[]] {
  // Find indices of non-empty columns from the first row
  const nonEmptyColumnIndices = headers.reduce<number[]>((acc, header, index) => {
    // Check if any row has data in this column
    const hasData = csvData.some(row => row[index]?.trim() !== '');
    if (hasData) acc.push(index);
    return acc;
  }, []);

  // Filter headers
  const cleanHeaders = nonEmptyColumnIndices.map(i => headers[i]);

  // Filter data rows
  const cleanData = csvData.map(row =>
    nonEmptyColumnIndices.map(i => row[i] || '')
  );

  return [cleanData, cleanHeaders];
}

export default function RithmicOrderProcessor({ csvData, headers, processedTrades, setProcessedTrades }: PlatformProcessorProps) {
  const [tickDetails, setTickDetails] = useState<TickDetails[]>([])
  const [incompleteTrades, setIncompleteTrades] = useState<IncompleteTrade[]>([])
  
  useEffect(() => {
    const fetchTickDetails = async () => {
      const details = await getTickDetails()
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
    // Clean the CSV data first
    const [cleanData, cleanHeaders] = cleanCsvData(csvData, headers);
    
    const processedTrades: Trade[] = [];
    const incompleteTradesArray: IncompleteTrade[] = [];

    // Group orders by account
    const ordersByAccount = cleanData.reduce((acc, row) => {
      const accountIndex = getHeaderIndex('Account');
      const account = row[accountIndex];
      if (!acc[account]) {
        acc[account] = [];
      }
      acc[account].push(row);
      return acc;
    }, {} as Record<string, string[][]>);

    // Process each account's orders separately
    Object.entries(ordersByAccount).forEach(([account, accountOrders]) => {
      const openPositions: { [key: string]: OpenPosition } = {};

      // Sort orders by Update Time column in ascending order
      const sortedAccountOrders = accountOrders.sort((a, b) => {
        const timeIndex = getHeaderIndex('update time')
        if (timeIndex === -1) return 0
        return parseDate(a[timeIndex]).getTime() - parseDate(b[timeIndex]).getTime()
      });

      sortedAccountOrders.forEach((row) => {
        if (row.length !== cleanHeaders.length) {
          console.warn('Row length mismatch:', row);
          return; // Skip invalid rows
        }

        const order = cleanHeaders.reduce((acc, header, index) => {
          acc[header] = row[index]?.trim() || '';
          return acc;
        }, {} as Record<string, string>);

        // Add validation for required fields
        const requiredFields = ["Symbol", "Qty Filled", "Avg Fill Price", "Buy/Sell"];
        const missingFields = requiredFields.filter(field => !order[field]);
        
        if (missingFields.length > 0) {
          console.warn(`Missing required fields: ${missingFields.join(', ')}`, order);
          return; // Skip this row
        }

        const symbol = order["Symbol"].slice(0, -2)
        const quantity = parseInt(order["Qty Filled"])
        const price = parsePrice(order["Avg Fill Price"])
        const side = order["Buy/Sell"]
        const timestamp = order[cleanHeaders.find(header => 
          header.toLowerCase().includes('update time')
        ) || '']
        const commissionRate = parseFloat(order["Commission Fill Rate"])
        const orderCommission = commissionRate * quantity
        const orderId = order["Order Number"]

        console.log({
          orderId,
          symbol,
          quantity,
          price,
          side,
          timestamp,
          commissionRate,
          orderCommission,
          openPositions,
        });
        
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

              const trade: Partial<Trade> = {
                id: `${openPosition.entryOrders.map(o => o.orderId).join('-')}-${openPosition.exitOrders.map(o => o.orderId).join('-')}`,
                accountNumber: account,
                quantity: openPosition.originalQuantity,
                entryId: openPosition.entryOrders.map(o => o.orderId).join('-'),
                closeId: openPosition.exitOrders.map(o => o.orderId).join('-'),
                instrument: symbol,
                entryPrice: openPosition.averageEntryPrice.toFixed(5),
                closePrice: (openPosition.exitOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / 
                             openPosition.exitOrders.reduce((sum, o) => sum + o.quantity, 0)).toFixed(5),
                entryDate: parseDate(openPosition.entryDate).toISOString(),
                closeDate: parseDate(timestamp).toISOString(),
                pnl: pnl,
                timeInPosition: (parseDate(timestamp).getTime() - parseDate(openPosition.entryDate).getTime()) / 1000,
                userId: openPosition.userId,
                side: openPosition.side,
                commission: openPosition.totalCommission,
                createdAt: new Date(),
                comment: null,
                videoUrl: null,
                tags: [],
                imageBase64: null,
                imageBase64Second: null,
                groupId: null
              }

              processedTrades.push(trade as Trade)

              if (openPosition.quantity < 0) {
                // Reverse position
                openPositions[symbol] = {
                  accountNumber: account,
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
            accountNumber: account,
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
      });

      // Process incomplete trades for this account
      Object.entries(openPositions).forEach(([symbol, position]) => {
        const incompleteTrade: IncompleteTrade = {
          ...position,
          openingOrderDetails: `${position.side} ${position.quantity} @ ${position.averageEntryPrice.toFixed(2)}`
        };
        incompleteTradesArray.push(incompleteTrade);
      });
    });

    console.log('processedTrades', processedTrades);
    setProcessedTrades(processedTrades);
    setIncompleteTrades(incompleteTradesArray);

    if (incompleteTradesArray.length > 0) {
      toast.error("Incomplete Trades Detected", {
        description: `${incompleteTradesArray.length} trade(s) were not completed and have been removed from the analysis.`,
      });
    }
  }, [csvData, headers, setProcessedTrades, tickDetails, getHeaderIndex]);

  useEffect(() => {
    processOrders()
  }, [processOrders])

  const uniqueSymbols = useMemo(() => Array.from(new Set(processedTrades.map(trade => trade.instrument))), [processedTrades])

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

  const totalPnL = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0), [processedTrades])
  const totalCommission = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0), [processedTrades])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-6">
          {incompleteTrades.length > 0 && (
            <div className="flex-none bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r" role="alert">
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
          <div className="px-2">
            <h3 className="text-lg font-semibold mb-2">Contract Specifications</h3>
            <div className="grid grid-cols-3 gap-4">
              {tradedTickDetails.map((detail) => (
                <div key={detail.ticker} className="space-y-2 p-4 border rounded-lg bg-muted/30">
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
          <div className="px-2">
            <h3 className="text-lg font-semibold mb-2">Processed Trades</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
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
                {processedTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{trade.accountNumber}</TableCell>
                    <TableCell>{trade.instrument}</TableCell>
                    <TableCell>{trade.side}</TableCell>
                    <TableCell>{trade.quantity}</TableCell>
                    <TableCell>{trade.entryPrice}</TableCell>
                    <TableCell>{trade.closePrice || '-'}</TableCell>
                    <TableCell>{trade.entryDate ? new Date(trade.entryDate).toLocaleString() : '-'}</TableCell>
                    <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                    <TableCell>{trade.pnl ? trade.pnl.toFixed(2) : '-'}</TableCell>
                    <TableCell>{trade.timeInPosition ? `${Math.floor(trade.timeInPosition / 60)}m ${Math.floor(trade.timeInPosition % 60)}s` : '-'}</TableCell>
                    <TableCell>{trade.commission ? trade.commission.toFixed(2) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between px-2 py-4">
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
          <div className="px-2">
            <h3 className="text-lg font-semibold mb-2">Instruments Traded</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueSymbols.map((symbol) => (
                <Button
                  key={symbol}
                  variant="outline"
                >
                  {symbol}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
