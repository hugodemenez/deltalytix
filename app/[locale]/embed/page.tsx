'use client'

import React from 'react'
import TimeRangePerformanceChart from './time-range-performance'
import {
  DailyPnLChartEmbed,
  TimeOfDayPerformanceChart,
  TimeInPositionByHourChart,
  PnLBySideChartEmbed,
  TradeDistributionChartEmbed,
  WeekdayPnLChartEmbed,
  PnLPerContractChartEmbed,
  PnLPerContractDailyChartEmbed,
  TickDistributionChartEmbed,
  CommissionsPnLEmbed,
  ContractQuantityChartEmbed,
} from './index'
import { toast, Toaster } from 'sonner'
import { processPhoenixOrdersWithFIFO } from '@/lib/phoenix-fifo-processor'
import { parsePhoenixOrders } from '@/lib/phoenix-order-parser'
import { useSearchParams } from 'next/navigation'
import { ThemeProvider, useTheme } from '@/context/theme-provider'

// Mock trade data enriched with typical fields
const instruments = ['ES', 'NQ', 'CL', 'GC'] as const
const sides = ['long', 'short'] as const
const now = Date.now()
const dayMs = 24 * 60 * 60 * 1000
const mockTrades = Array.from({ length: 60 }, (_, i) => {
  const entry = new Date(now - Math.floor(Math.random() * 30) * dayMs - Math.floor(Math.random() * 24) * 3600 * 1000)
  const qty = Math.ceil(Math.random() * 3)
  const pnl = Math.round(((Math.random() - 0.4) * 500) * 100) / 100
  const timeInPosition = Math.floor(Math.random() * 3600)
  return {
    pnl,
    timeInPosition,
    entryDate: entry.toISOString(),
    side: sides[Math.floor(Math.random() * sides.length)],
    quantity: qty,
    commission: Math.round(qty * (1 + Math.random() * 3) * 100) / 100,
    instrument: instruments[Math.floor(Math.random() * instruments.length)],
  }
})

// Function to generate random trade data
function generateRandomTrade() {
  const qty = Math.ceil(Math.random() * 3)
  const pnl = (Math.random() - 0.4) * 500
  const timeInPosition = Math.random() * 3600
  const entry = new Date(Date.now() - Math.floor(Math.random() * 20) * dayMs)
  return {
    pnl: Math.round(pnl * 100) / 100,
    timeInPosition: Math.round(timeInPosition),
    entryDate: entry.toISOString(),
    side: sides[Math.floor(Math.random() * sides.length)],
    quantity: qty,
    commission: Math.round(qty * (1 + Math.random() * 3) * 100) / 100,
    instrument: instruments[Math.floor(Math.random() * instruments.length)],
  }
}

// Function to generate multiple random trades
function generateRandomTrades(count: number = 1) {
    return Array.from({ length: count }, generateRandomTrade)
}
export default function EmbedPage() {
    const searchParams = useSearchParams()
    const theme = searchParams.get('theme') || 'dark'
    const { setTheme } = useTheme()
    setTheme(theme as "light" | "dark" | "system")
    const [trades, setTrades] = React.useState<any[]>(mockTrades)

    // Message listener for iframe communication
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            toast.message('Received message from iframe', { description: JSON.stringify(event) })
            // Validate origin for security (you can customize this)
            // if (event.origin !== 'http://localhost:3000') return

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

                if (data.type === 'ADD_TRADES') {
                    const { count = 1, trades: newTrades } = data

                    if (newTrades && Array.isArray(newTrades)) {
                        // Add provided trades
                        setTrades(prev => [...prev, ...newTrades])
                    } else {
                        // Generate random trades
                        const randomTrades = generateRandomTrades(count)
                        setTrades(prev => [...prev, ...randomTrades])
                    }
                } else if (data.type === 'RESET_TRADES') {
                    // Reset to original mock data
                    setTrades(mockTrades)
                } else if (data.type === 'CLEAR_TRADES') {
                    // Clear all trades
                    setTrades([])
                } else if (data.type === 'ADD_PHOENIX_ORDERS') {
                    toast.message('Received message from iframe', { description: event.data.orders.length })
                    const { orders } = data
                    // Process Phoenix orders
                    if (orders && Array.isArray(orders)) {
                        const parsedOrders = parsePhoenixOrders(orders)
                        const processedOrdersWithFIFO = processPhoenixOrdersWithFIFO(parsedOrders.processedOrders)
                        toast.message('Processed ' + processedOrdersWithFIFO.trades.length + ' trades', { description: processedOrdersWithFIFO.trades.map(trade => trade.pnl).join(', ') })
                        setTrades(prev => [
                          ...prev,
                          ...processedOrdersWithFIFO.trades.map(trade => ({
                            pnl: trade.pnl,
                            timeInPosition: trade.timeInPosition,
                            entryDate: trade.entryDate,
                            side: trade.side,
                            quantity: trade.quantity,
                            commission: trade.commission,
                            instrument: trade.instrument,
                          })),
                        ])
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error)
            }
        }

        window.addEventListener('message', handleMessage)

        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    const selectedInstrument = React.useMemo(() => {
      const counts: Record<string, number> = {}
      trades.forEach((t) => {
        if (!t.instrument) return
        counts[t.instrument] = (counts[t.instrument] || 0) + 1
      })
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || instruments[0]
    }, [trades])

    return (
      <ThemeProvider>
        <div className="w-full h-full min-h-[400px]">
          <Toaster />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <TimeRangePerformanceChart trades={trades} />
            <DailyPnLChartEmbed trades={trades} />
            <TimeOfDayPerformanceChart trades={trades} />
            <TimeInPositionByHourChart trades={trades} />
            <PnLBySideChartEmbed trades={trades} />
            <TradeDistributionChartEmbed trades={trades} />
            <WeekdayPnLChartEmbed trades={trades} />
            <PnLPerContractChartEmbed trades={trades} />
            <PnLPerContractDailyChartEmbed trades={trades} instrument={selectedInstrument} />
            <TickDistributionChartEmbed trades={trades} />
            <CommissionsPnLEmbed trades={trades} />
            <ContractQuantityChartEmbed trades={trades} />
          </div>
        </div>
      </ThemeProvider>
    )
}