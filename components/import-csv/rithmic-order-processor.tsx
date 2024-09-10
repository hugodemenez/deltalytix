'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Trade } from '@prisma/client'
import { useUser } from '../context/user-data'
import debounce from 'lodash/debounce'
import { Button } from '../ui/button'
import { toast } from '@/hooks/use-toast'
import { getTickDetails } from '@/server/database'

interface RithmicOrder {
  "Account": string
  "Buy/Sell": "B" | "S"
  "Qty Filled": string
  "Symbol": string
  "Limit Price": string
  "Order Number": string
  "Update Time (RDT)": string
  "Commission Fill Rate": string
  "Closed Profit/Loss": string
}

interface RithmicOrderProcessorProps {
  csvData: string[][]
  headers: string[]
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>
}



export default function RithmicOrderProcessor({ csvData, headers, setProcessedTrades }: RithmicOrderProcessorProps) {
  const [tickValues, setTickValues] = useState<{ [key: string]: { tickValue: number, tickSize: number } }>({})
  const [trades, setTrades] = useState<Trade[]>([])
  const { user } = useUser()

  useEffect(() => {
    const fetchTickDetails = async () => {
      const tickDetails = await getTickDetails()
      // Format the tickDetails to be used in the tickValues
      const tickValues = tickDetails.reduce((acc, tickDetail) => {
        acc[tickDetail.ticker] = { tickValue: tickDetail.tickValue, tickSize: tickDetail.tickSize }
        return acc
      }, {} as { [key: string]: { tickValue: number, tickSize: number } })
      setTickValues(tickValues)
    }
    fetchTickDetails()
  }, [])

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
    // To get instrument tick value, we only get first 2 characters of the instrument
    const instrument = partialTrade.instrument!.slice(0, 2)
    const tickValue = tickValues[instrument]?.tickValue
    const tickSize = tickValues[instrument]?.tickSize
    if (!tickValue) {
      return 0
    }
    if (partialTrade.side === 'Short') {
      // Round to 2 decimal places
      return Math.round((parseFloat(partialTrade.entryPrice!) - parseFloat(partialTrade.closePrice!)) / tickSize * partialTrade.quantity! * tickValue * 100) / 100
    }
    return Math.round((parseFloat(partialTrade.closePrice!) - parseFloat(partialTrade.entryPrice!)) / tickSize * partialTrade.quantity! * tickValue * 100) / 100
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
    const ongoingTrades: { symbol: string, remainingQuantity: number, closePrice: string }[] = []
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
            // We add the price to the entry price
            matchedTrade.entryPrice = ((parseFloat(matchedTrade.entryPrice || '0')  + (price * quantity)) ).toString()
          }
          else {
            // If opposite side and quantity is equal to the matchedTrade.quantity, close the position
            if (matchedTrade.quantity === quantity) {
              matchedTrade.entryPrice = (parseFloat(matchedTrade.entryPrice || '0') / matchedTrade.quantity!).toString()
              matchedTrade.closeId = orderNumber
              matchedTrade.closeDate = timestamp
              matchedTrade.closePrice = price.toString()
              matchedTrade.commission = (matchedTrade.commission || 0) + commission
              matchedTrade.timeInPosition = (new Date(timestamp).getTime() - new Date(matchedTrade.entryDate!).getTime()) / 1000
              matchedTrade.pnl = computePnl(matchedTrade)
            }
            else {
              // If opposite side and quantity is less than the matchedTrade.quantity, remember the quantity remaining to be closed
              if (matchedTrade.side !== (side === 'B' ? 'Long' : 'Short')) {
                console.log('Reducing trade', matchedTrade)
                // We add to a list of remaining trades to be closed
                // We check beforehand if the trade is already in the list
                const existingTrade = ongoingTrades.find(trade => trade.symbol === symbol)
                if (existingTrade) {
                  // We decrease the remaining quantity of the trade
                  existingTrade.remainingQuantity -= quantity
                  // We add the price to the exit price
                  existingTrade.closePrice = (parseFloat(existingTrade.closePrice || '0')  + (price * quantity)).toString()
                  // If the remaining quantity is 0, we remove the trade from the list
                  if (existingTrade.remainingQuantity === 0) {
                    ongoingTrades.splice(ongoingTrades.indexOf(existingTrade), 1)
                    console.log('Trade closed', existingTrade)
                    // We add remaining fields to the trade
                    matchedTrade.entryPrice = (parseFloat(matchedTrade.entryPrice || '0') / matchedTrade.quantity!).toFixed(3).toString()
                    matchedTrade.closeDate = timestamp
                    matchedTrade.closePrice = (parseFloat(existingTrade.closePrice || '0') / matchedTrade.quantity!).toFixed(3).toString()
                    matchedTrade.commission = (matchedTrade.commission || 0) + commission
                    matchedTrade.timeInPosition = (new Date(timestamp).getTime() - new Date(matchedTrade.entryDate!).getTime()) / 1000
                    matchedTrade.closeId = orderNumber
                    matchedTrade.pnl = computePnl(matchedTrade)
                  }
                }
                // There is no ongoingTrade for this symbol, we create a new one
                else {
                  ongoingTrades.push({ symbol: symbol, remainingQuantity: matchedTrade.quantity! - quantity, closePrice: price.toString() })
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
                value={tickValues[symbol.slice(0, 2)]?.tickValue || ""}
                disabled
                placeholder="Enter tick value"
                className="w-full"
                aria-label={`Tick value for ${symbol}`}
              />
              <Button onClick={()=>toast({title: "Wrong / missing tick value", description: `Please contact support for ${symbol} at support@deltalytix.app we are working on automating this process`})}>Report wrong / missing tick value</Button>
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