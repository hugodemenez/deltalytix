'use client'

import React from 'react'
import TimeRangePerformanceChart from './time-range-performance'
import { toast, Toaster } from 'sonner'
import { processPhoenixOrdersWithFIFO } from '@/lib/phoenix-fifo-processor'
import { parsePhoenixOrders } from '@/lib/phoenix-order-parser'
import { useSearchParams } from 'next/navigation'
import { ThemeProvider, useTheme } from '@/context/theme-provider'

// Mock trade data with PnL and time in position
const mockTrades = [
    { pnl: 125.50, timeInPosition: 45 }, // 45 seconds
    { pnl: -87.25, timeInPosition: 120 }, // 2 minutes
    { pnl: 234.75, timeInPosition: 300 }, // 5 minutes
    { pnl: -156.00, timeInPosition: 180 }, // 3 minutes
    { pnl: 89.30, timeInPosition: 90 }, // 1.5 minutes
    { pnl: 445.60, timeInPosition: 900 }, // 15 minutes
    { pnl: -78.90, timeInPosition: 240 }, // 4 minutes
    { pnl: 167.25, timeInPosition: 600 }, // 10 minutes
    { pnl: -234.15, timeInPosition: 150 }, // 2.5 minutes
    { pnl: 312.80, timeInPosition: 1800 }, // 30 minutes
    { pnl: -45.60, timeInPosition: 75 }, // 1.25 minutes
    { pnl: 198.40, timeInPosition: 450 }, // 7.5 minutes
    { pnl: -123.70, timeInPosition: 210 }, // 3.5 minutes
    { pnl: 267.90, timeInPosition: 1200 }, // 20 minutes
    { pnl: -89.30, timeInPosition: 105 }, // 1.75 minutes
    { pnl: 156.75, timeInPosition: 360 }, // 6 minutes
    { pnl: -201.45, timeInPosition: 270 }, // 4.5 minutes
    { pnl: 334.20, timeInPosition: 1500 }, // 25 minutes
    { pnl: -67.80, timeInPosition: 135 }, // 2.25 minutes
    { pnl: 189.60, timeInPosition: 720 }, // 12 minutes
    { pnl: -145.30, timeInPosition: 195 }, // 3.25 minutes
    { pnl: 278.45, timeInPosition: 1080 }, // 18 minutes
    { pnl: -112.90, timeInPosition: 165 }, // 2.75 minutes
    { pnl: 203.70, timeInPosition: 540 }, // 9 minutes
    { pnl: -78.25, timeInPosition: 225 }, // 3.75 minutes
    { pnl: 356.80, timeInPosition: 2100 }, // 35 minutes
    { pnl: -134.60, timeInPosition: 255 }, // 4.25 minutes
    { pnl: 245.30, timeInPosition: 1350 }, // 22.5 minutes
    { pnl: -91.45, timeInPosition: 285 }, // 4.75 minutes
    { pnl: 178.90, timeInPosition: 840 }, // 14 minutes
]

// Function to generate random trade data
function generateRandomTrade() {
    const pnl = (Math.random() - 0.4) * 500 // Slightly biased towards positive PnL
    const timeInPosition = Math.random() * 3600 // Random time up to 1 hour (3600 seconds)

    return {
        pnl: Math.round(pnl * 100) / 100, // Round to 2 decimal places
        timeInPosition: Math.round(timeInPosition)
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
    const [trades, setTrades] = React.useState<{ pnl: number, timeInPosition: number }[]>(mockTrades)

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
                        setTrades(prev => [...prev, ...processedOrdersWithFIFO.trades.map(trade => ({ pnl: trade.pnl, timeInPosition: trade.timeInPosition }))]
                        )
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

    return (
        <ThemeProvider>
            <div className="w-full h-full min-h-[400px] max-h-[800px] ">
                <Toaster />
                <TimeRangePerformanceChart trades={trades} />
            </div>
        </ThemeProvider>
    )
}