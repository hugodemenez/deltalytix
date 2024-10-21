"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useFormattedTrades } from "@/components/context/trades-data"
import { TickDetails, Trade } from "@prisma/client"
import { getTickDetails } from "@/server/database"
import { useEffect, useState } from "react"

interface ContractSpec {
  tickSize: number
  tickValue: number
}

const defaultContractSpecs: { [key: string]: ContractSpec } = {
  NQ: { tickSize: 0.25, tickValue: 5 },
  YM: { tickSize: 1, tickValue: 5 },
  MYM: { tickSize: 1, tickValue: 0.5 },
  MNQ: { tickSize: 0.25, tickValue: 0.5 },
  ES: { tickSize: 0.25, tickValue: 12.50 },
  MES: { tickSize: 0.25, tickValue: 1.25 },
  ZN: { tickSize: 1 / 64, tickValue: 15.625 },
  ZB: { tickSize: 1 / 32, tickValue: 31.25 },
  GC: { tickSize: 0.10, tickValue: 10.00 },
  SI: { tickSize: 0.005, tickValue: 25.00 },
  ZC: { tickSize: 0.01, tickValue: 12.50 },
  UB: { tickSize: 0.01, tickValue: 31.25 },
}

const chartConfig = {
  tradeCount: {
    label: "Number of Trades",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function TickDistributionChart() {
  const { formattedTrades: trades } = useFormattedTrades()
  const [tickDetails, setTickDetails] = useState<TickDetails[]>([])
  useEffect(() => {
    const fetchTickDetails = async () => {
      const details = await getTickDetails()
      console.log(details)
      setTickDetails(details)
    }
    fetchTickDetails()
  }, [])
  const chartData = React.useMemo(() => {
    const tickDistribution: { [key: number]: number } = {}

    if (!tickDetails || tickDetails.length === 0) return []
     trades.forEach((trade: Trade) => {
    
      const contractSpec = tickDetails.find(detail => detail.ticker === trade.instrument) || { tickSize: 1, tickValue: 1 }
      const tickValue = Math.round(trade.pnl / trade.quantity / contractSpec.tickValue)

      if (!tickDistribution[tickValue]) {
        tickDistribution[tickValue] = 0
      }
      tickDistribution[tickValue]++
    })

    return Object.entries(tickDistribution)
      .map(([ticks, count]) => ({
        ticks: parseInt(ticks),
        tradeCount: count,
      }))
      .sort((a, b) => a.ticks - b.ticks)
  }, [trades, tickDetails])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{`${label} ticks`}</p>
          <p>Number of Trades: {data.tradeCount}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>Tick Distribution</CardTitle>
        <CardDescription>Distribution of trades based on their tick value</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="ticks"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="tradeCount"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
                className="transition-all duration-300 ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

