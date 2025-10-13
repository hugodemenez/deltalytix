'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts'

interface EquityCurveData {
  date: string
  pnl: number
  cumulativePnL: number
  tradeNumber: number
}

interface DailyEquityData {
  date: string
  dailyPnL: number
  cumulativePnL: number
  tradeCount: number
}

interface UserEquityChartProps {
  equityCurve: EquityCurveData[]
  userId: string
  totalPnL: number
  showDailyView?: boolean
}

// Helper to group trades by day and calculate daily equity
function groupTradesByDay(equityCurve: EquityCurveData[]): DailyEquityData[] {
  if (!equityCurve.length) return []

  // Group trades by date
  const dailyGroups = equityCurve.reduce((acc, trade) => {
    const date = trade.date
    if (!acc[date]) {
      acc[date] = {
        date,
        dailyPnL: 0,
        cumulativePnL: 0,
        tradeCount: 0
      }
    }
    acc[date].dailyPnL += trade.pnl
    acc[date].tradeCount += 1
    return acc
  }, {} as Record<string, DailyEquityData>)

  // Calculate cumulative PnL and sort by date
  const sortedDates = Object.keys(dailyGroups).sort()
  let cumulativePnL = 0
  
  return sortedDates.map(date => {
    cumulativePnL += dailyGroups[date].dailyPnL
    return {
      ...dailyGroups[date],
      cumulativePnL
    }
  })
}

// Helper to generate "nice" ticks for the X axis (dates)
function getSmartDateTicks(dailyData: DailyEquityData[]) {
  if (!dailyData.length) return []
  
  const totalDays = dailyData.length
  let step = 1
  
  // Decide step based on number of days
  if (totalDays > 365) step = 30 // Monthly for >1 year
  else if (totalDays > 90) step = 7 // Weekly for >3 months
  else if (totalDays > 30) step = 3 // Every 3 days for >1 month
  else if (totalDays > 7) step = 1 // Daily for >1 week

  const ticks: string[] = []
  for (let i = 0; i < dailyData.length; i += step) {
    ticks.push(dailyData[i].date)
  }
  
  // Always include the last date if not already included
  if (dailyData.length > 0 && !ticks.includes(dailyData[dailyData.length - 1].date)) {
    ticks.push(dailyData[dailyData.length - 1].date)
  }
  
  return ticks
}

// Helper to generate "nice" ticks for the X axis (trade numbers)
function getSmartTicks(equityCurve: EquityCurveData[]) {
  if (!equityCurve.length) return []
  const minTrade = Math.min(...equityCurve.map(d => d.tradeNumber))
  const maxTrade = Math.max(...equityCurve.map(d => d.tradeNumber))
  const range = maxTrade - minTrade

  // Decide step based on range
  let step = 1
  if (range > 5000) step = 1000
  else if (range > 2000) step = 500
  else if (range > 1000) step = 200
  else if (range > 500) step = 100
  else if (range > 200) step = 50
  else if (range > 50) step = 10
  else if (range > 20) step = 5

  // Always include first and last
  const ticks = [minTrade]
  for (let t = minTrade + step; t < maxTrade; t += step) {
    ticks.push(t)
  }
  if (maxTrade !== minTrade) ticks.push(maxTrade)
  return ticks
}

export function UserEquityChart({ equityCurve, userId, totalPnL, showDailyView = true }: UserEquityChartProps) {
  const dailyData = groupTradesByDay(equityCurve)
  const chartData = showDailyView ? dailyData : equityCurve
  const xTicks = showDailyView ? getSmartDateTicks(dailyData) : getSmartTicks(equityCurve)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (showDailyView) {
        const dailyPnL = payload[0]?.payload?.dailyPnL || 0
        const cumulativeValue = payload[0]?.payload?.cumulativePnL || 0
        const tradeCount = payload[0]?.payload?.tradeCount || 0
        
        // Format date for display
        const date = new Date(label)
        const formattedDate = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        })
        
        return (
          <div className="rounded-lg border bg-background p-2 shadow-xs">
            <div className="grid gap-2">
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Date
                </span>
                <span className="font-bold text-muted-foreground">
                  {formattedDate}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Daily P&L
                </span>
                <span className="font-bold text-foreground">
                  {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Cumulative
                </span>
                <span className="font-bold text-foreground">
                  {cumulativeValue >= 0 ? '+' : ''}{cumulativeValue.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Trades
                </span>
                <span className="font-bold text-foreground">
                  {tradeCount}
                </span>
              </div>
            </div>
          </div>
        )
      } else {
        // Trade view tooltip
        const pnlValue = payload[0]?.value || 0
        const cumulativeValue = payload[0]?.payload?.cumulativePnL || 0
        
        return (
          <div className="rounded-lg border bg-background p-2 shadow-xs">
            <div className="grid gap-2">
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Trade #{payload[0]?.payload?.tradeNumber || 'N/A'}
                </span>
                <span className="font-bold text-muted-foreground">
                  {label}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  P&L
                </span>
                <span className="font-bold text-foreground">
                  {pnlValue >= 0 ? '+' : ''}{pnlValue.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  Cumulative
                </span>
                <span className="font-bold text-foreground">
                  {cumulativeValue >= 0 ? '+' : ''}{cumulativeValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )
      }
    }
    return null
  }

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={chartData}
          margin={{ left: 10, right: 8, top: 8, bottom: 24 }}
        >
          <defs>
            <linearGradient id={`color-${userId.replace(/[^a-zA-Z0-9-_]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={totalPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={totalPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="text-border dark:opacity-[0.12] opacity-[0.2]"
          />
          <XAxis 
            dataKey={showDailyView ? "date" : "tradeNumber"}
            tickLine={false}
            axisLine={false}
            height={24}
            tickMargin={8}
            ticks={xTicks}
            tick={{ 
              fontSize: 11,
              fill: 'currentColor'
            }}
            tickFormatter={showDailyView ? (value) => {
              const date = new Date(value)
              const now = new Date()
              const isCurrentYear = date.getFullYear() === now.getFullYear()
              
              if (isCurrentYear) {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              } else {
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
              }
            } : (value) => `#${value}`}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            width={60}
            tickMargin={4}
            tick={{ 
              fontSize: 11,
              fill: 'currentColor'
            }}
            tickFormatter={(value) => Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulativePnL"
            stroke={totalPnL >= 0 ? "#10b981" : "#ef4444"}
            fillOpacity={1}
            fill={`url(#color-${userId})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 3, style: { fill: totalPnL >= 0 ? "#10b981" : "#ef4444" } }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
} 