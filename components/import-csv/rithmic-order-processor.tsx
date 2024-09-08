'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Trade } from '@prisma/client'
import { useUser } from '../context/user-data'
import debounce from 'lodash/debounce'

interface RithmicOrder {
  "Account": string
  "Status": string
  "Buy/Sell": "B" | "S"
  "Qty To Fill": string
  "Max Show Qty": string
  "Symbol": string
  "Price Type": string
  "Limit Price": string
  "Order Number": string
  "Update Time (RDT)": string
  "Qty Filled": string
  "Commission Fill Rate": string
  "Closed Profit/Loss": string
}

interface RithmicOrderProcessorProps {
  csvData: string[][]
  headers: string[]
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>
}



export default function RithmicOrderProcessor({ csvData, headers, setProcessedTrades }: RithmicOrderProcessorProps) {
  const [tickValues, setTickValues] = useState<{ [key: string]: { tickValue: number } }>({})
  const [trades, setTrades] = useState<Trade[]>([])
  const { user } = useUser()

  const orders: RithmicOrder[] = useMemo(() => {
    return csvData.map(row => {
      const order: any = {}
      headers.forEach((header, index) => {
        order[header] = row[index]
      })
      return order as RithmicOrder
    })
  }, [csvData, headers])

  const uniqueSymbols = useMemo(() => {
    return Array.from(new Set(orders.filter(order => order.Symbol && order.Symbol.trim() !== '').map(order => order.Symbol)));
  }, [orders])

  const computePnl = useCallback((partialTrade: Partial<Trade>): number => {
    if (!partialTrade.entryPrice || !partialTrade.closePrice || !partialTrade.quantity) {
      return 0
    }
    const tickValue = tickValues[partialTrade.instrument!]?.tickValue
    if (!tickValue) {
      return 0
    }
    if (partialTrade.side === 'Short') {
      return (parseFloat(partialTrade.entryPrice!) - parseFloat(partialTrade.closePrice!)) * partialTrade.quantity! * tickValue
    }
    return (parseFloat(partialTrade.closePrice!) - parseFloat(partialTrade.entryPrice!)) * partialTrade.quantity! * tickValue
  }, [tickValues])

  const completeTrade = useCallback((partialTrade: Partial<Trade>): Trade => {
    return {
      id: partialTrade.id ?? '',
      accountNumber: partialTrade.accountNumber ?? '',
      quantity: partialTrade.quantity ?? 0,
      entryId: partialTrade.entryId ?? null,
      closeId: partialTrade.closeId ?? null,
      instrument: partialTrade.instrument ?? '',
      entryPrice: partialTrade.entryPrice ?? '',
      closePrice: partialTrade.closePrice ?? '',
      entryDate: partialTrade.entryDate ?? '',
      closeDate: partialTrade.closeDate ?? '',
      pnl: partialTrade.pnl ?? computePnl(partialTrade),
      timeInPosition: partialTrade.timeInPosition ?? 0,
      userId: partialTrade.userId ?? '',
      side: partialTrade.side ?? 'Long',
      commission: partialTrade.commission ?? 0,
      createdAt: partialTrade.createdAt ?? new Date(),
      comment: partialTrade.comment ?? null,
    };
  }, [computePnl])

  const processOrders = useCallback(() => {
    const trades: Partial<Trade>[] = []
    const ongoingTrades: { symbol: string, remainingQuantity: number }[] = []
    let lastPnl = 0

    orders.forEach((order) => {
      if (!order["Symbol"] || !order["Qty Filled"] || !order["Limit Price"] ||
        !order["Buy/Sell"] || !order["Update Time (RDT)"] ||
        !order["Account"] || !order["Order Number"] || !order["Closed Profit/Loss"]) {
        console.warn('Skipping order due to missing required fields:', order);
        return;
      }

      const symbol = order["Symbol"];
      const quantity = parseInt(order["Qty Filled"]);
      const price = parseFloat(order["Limit Price"].replace("'", ""));
      const side = order["Buy/Sell"];
      const timestamp = order["Update Time (RDT)"];
      const closedPnL = parseFloat(order["Closed Profit/Loss"]);
      const commission = parseFloat(order["Commission Fill Rate"]);
      const accountNumber = order["Account"];
      const orderNumber = order["Order Number"];

      if (quantity <= 0 || price <= 0) {
        console.warn('Skipping order due to invalid quantity or price:', order);
        return;
      }

      // If pnl is different from 0 and different than previous pnl, we calculate the tick value
      if (closedPnL !== 0 && closedPnL !== lastPnl) {
        // We calculate the tick value of the previous trade
        // find the previous trade in the trades array
        // We should sort the trades by closeDate desc (because latest trades is element 0)
        // We filter out the trades that are not closed
        const previousTrade = trades.filter(trade => trade.closeDate !== undefined).sort((a, b) => new Date(b.closeDate!).getTime() - new Date(a.closeDate!).getTime())[0]
        if (previousTrade) {
          // Check if the tick value is already set
          if (!tickValues[previousTrade.instrument!]) {
            // We calculate the price change
            const priceChange = Math.abs(parseFloat(previousTrade.closePrice!) - parseFloat(previousTrade.entryPrice!))
            // Then we know for the price change, the value it represents for 1 quantity and 1 price change
            const tickValue = Math.abs((closedPnL - (previousTrade.pnl || 0))) / (quantity * priceChange)
            handleTickValueChange(previousTrade.instrument!, tickValue.toString())
          }
          lastPnl = closedPnL
        }
      }

      const openedPositions = trades.filter(trade => trade.closeDate === undefined)
      if (openedPositions.length === 0) {
        // We create a new trade for the opened position
        trades.push({
          accountNumber: accountNumber,
          quantity: quantity,
          entryId: orderNumber,
          instrument: symbol,
          entryPrice: price.toString(),
          entryDate: timestamp,
          side: side === 'B' ? 'Long' : 'Short',
          commission: commission,
          userId: user?.id,
        } as Partial<Trade>);
      }
      else {
        // We have to find if the current order is for the opened position
        const matchedTrade = openedPositions.find(trade => trade.instrument === symbol) as Partial<Trade>
        if (matchedTrade) {
          // Either we close the position or we increase the size of the position
          if (matchedTrade.side === (side === 'B' ? 'Long' : 'Short')) {
            // If same side, we increase the size of the position
            matchedTrade.quantity = (matchedTrade.quantity || 0) + quantity
          }
          else {
            // If opposite side and quantity is equal to the matchedTrade.quantity, close the position
            if (matchedTrade.quantity === quantity) {
              matchedTrade.closeId = orderNumber
              matchedTrade.closeDate = timestamp
              matchedTrade.closePrice = price.toString()
              matchedTrade.commission = (matchedTrade.commission || 0) + commission
              matchedTrade.timeInPosition = (new Date(timestamp).getTime() - new Date(matchedTrade.entryDate!).getTime()) / 1000
            }
            else {
              // If opposite side and quantity is less than the matchedTrade.quantity, remember the quantity remaining to be closed
              if (matchedTrade.side !== (side === 'B' ? 'Long' : 'Short')) {
                // We add to a list of remaining trades to be closed
                // We check beforehand if the trade is already in the list
                const existingTrade = ongoingTrades.find(trade => trade.symbol === symbol)
                if (existingTrade) {
                  // We decrease the remaining quantity of the trade
                  existingTrade.remainingQuantity -= quantity
                  // If the remaining quantity is 0, we remove the trade from the list
                  if (existingTrade.remainingQuantity === 0) {
                    ongoingTrades.splice(ongoingTrades.indexOf(existingTrade), 1)
                    // We add remaining fields to the trade
                    matchedTrade.closeDate = timestamp
                    matchedTrade.closePrice = price.toString()
                    matchedTrade.commission = (matchedTrade.commission || 0) + commission
                  }
                }
                // There is no ongoingTrade for this symbol, we create a new one
                else {
                  ongoingTrades.push({ symbol: symbol, remainingQuantity: matchedTrade.quantity! - quantity })
                }
              }
              // If same side, we increase the size of the position
              else if (matchedTrade.side === (side === 'B' ? 'Long' : 'Short')) {
                matchedTrade.quantity = (matchedTrade.quantity || 0) + quantity
              }
            }
          }
        }
        // There is no opened position for this symbol, we create a new one
        else {
          trades.push({
            accountNumber: accountNumber,
            quantity: quantity,
            entryId: orderNumber,
            instrument: symbol,
            entryPrice: price.toString(),
            entryDate: timestamp,
            side: side === 'B' ? 'Long' : 'Short',
            commission: commission,
            userId: user?.id,
          } as Partial<Trade>);
        }
      }
    })

    // Convert partial trades to full trades
    const fullTrades = trades.map(trade => completeTrade(trade));

    setProcessedTrades(fullTrades);
    setTrades(fullTrades);
  }, [completeTrade, computePnl, orders, tickValues, user?.id])

  useEffect(() => {
    processOrders();
  }, [processOrders]);

  const handleTickValueChange = useCallback((symbol: string, value: string) => {
    setTickValues(prev => ({ ...prev, [symbol]: { tickValue: parseFloat(value) || 0 } }))
  }, [])

  const debouncedProcessOrders = useCallback(
    debounce(() => {
      processOrders()
    }, 1000),
    [processOrders]
  )

  const handleTickValueChangeWithDebounce = useCallback((symbol: string, value: string) => {
    handleTickValueChange(symbol, value)
    debouncedProcessOrders()
  }, [handleTickValueChange, debouncedProcessOrders])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Set Tick Values</h3>
        <div className="grid grid-cols-2 gap-4">
        {uniqueSymbols.map(symbol => (
            <div key={symbol} className="flex items-center space-x-2">
              <label htmlFor={`tick-${symbol}`} className="text-sm font-medium text-gray-700">
                {symbol}:
              </label>
              <Input
                id={`tick-${symbol}`}
                type="number"
                value={tickValues[symbol]?.tickValue || ""}
                onChange={(e) => handleTickValueChangeWithDebounce(symbol, e.target.value)}
                placeholder="Enter tick value"
                className="w-full"
                aria-label={`Tick value for ${symbol}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Processed Trades</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Close Price</TableHead>
              <TableHead>Entry Date</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, index) => (
              <TableRow key={index}>
                <TableCell>{trade.accountNumber}</TableCell>
                <TableCell>{trade.instrument}</TableCell>
                <TableCell>{trade.quantity}</TableCell>
                <TableCell>{trade.entryPrice}</TableCell>
                <TableCell>{trade.closePrice}</TableCell>
                <TableCell>{trade.entryDate}</TableCell>
                <TableCell>{trade.closeDate}</TableCell>
                <TableCell>{trade.pnl}</TableCell>
                <TableCell>{trade.side}</TableCell>
                <TableCell>{trade.commission.toFixed(2)}</TableCell>
                <TableCell>{trade.comment}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}