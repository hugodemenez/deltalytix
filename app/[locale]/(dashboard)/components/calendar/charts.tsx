"use client"

import React from 'react'
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, Legend, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart, ReferenceLine } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"
import { CalendarEntry } from "@/types/calendar"
import { useTheme } from "@/components/context/theme-provider"
import { Button } from "@/components/ui/button"
import { FaRegSadTear, FaRegMeh, FaRegSmileBeam } from "react-icons/fa"
import { saveMood, getMoodForDay } from '@/server/mood'
import { useUser } from '@/components/context/user-data'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/locales/client'

interface ChartsProps {
  dayData: CalendarEntry | undefined;
}

const chartConfig = {
  pnl: {
    label: "P&L Distribution",
    color: "hsl(var(--success))",
  },
  equity: {
    label: "Equity Variation",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number | undefined | null) => {
  if (value == null) return '$0.00'
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

export function Charts({ dayData }: ChartsProps) {
  const { effectiveTheme } = useTheme()
  const isDarkMode = effectiveTheme === 'dark'
  const { user } = useUser()
  const { toast } = useToast()
  const t = useI18n()
  const [isLoading, setIsLoading] = React.useState<'bad' | 'okay' | 'great' | null>(null)
  const [selectedMood, setSelectedMood] = React.useState<'bad' | 'okay' | 'great' | null>(null)

  const STORAGE_KEY = 'daily_mood'

  // Load mood from localStorage or fetch from server on mount
  React.useEffect(() => {
    const loadMood = async () => {
      if (!user?.id || !dayData?.trades?.[0]?.entryDate) return

      // Check localStorage first
      const focusedDay = new Date(dayData.trades[0].entryDate).toISOString().split('T')[0]
      const storedMoodData = localStorage.getItem(STORAGE_KEY)
      
      if (storedMoodData) {
        const storedMood = JSON.parse(storedMoodData)
        if (storedMood.date === focusedDay) {
          setSelectedMood(storedMood.mood)
          return
        }
      }

      // If no valid localStorage data, fetch from server
      try {
        const mood = await getMoodForDay(user.id, new Date(dayData.trades[0].entryDate))
        if (mood) {
          setSelectedMood(mood.mood as 'bad' | 'okay' | 'great')
          // Update localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            mood: mood.mood,
            date: focusedDay
          }))
        }
      } catch (error) {
        console.error('Error loading mood:', error)
      }
    }

    loadMood()
  }, [user?.id, dayData?.trades])

  const handleMoodSelect = async (mood: 'bad' | 'okay' | 'great') => {
    if (!user?.id || !dayData?.trades?.[0]?.entryDate) {
      toast({
        title: t('error'),
        description: t('auth.required'),
        variant: "destructive",
      })
      return
    }

    setIsLoading(mood)
    try {
      const date = new Date(dayData.trades[0].entryDate)
      // Set the time to noon to avoid timezone issues
      date.setHours(12, 0, 0, 0)
      await saveMood(user.id, mood, undefined, date)
      setSelectedMood(mood)
      
      // Save to localStorage
      const focusedDay = date.toISOString().split('T')[0]
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mood,
        date: focusedDay
      }))

      toast({
        title: t('success'),
        description: t('mood.saved'),
      })
    } catch (error) {
      console.error('Error saving mood:', error)
      toast({
        title: t('error'),
        description: t('mood.error'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  const getMoodButtonStyle = (moodType: 'bad' | 'okay' | 'great') => {
    const baseStyle = "flex flex-col items-center h-auto py-2 px-4"
    const hoverStyle = moodType === 'bad' ? 'hover:text-red-500' : 
                      moodType === 'okay' ? 'hover:text-yellow-500' : 
                      'hover:text-green-500'
    const selectedStyle = selectedMood === moodType ? 
                         (moodType === 'bad' ? 'text-red-500' : 
                          moodType === 'okay' ? 'text-yellow-500' : 
                          'text-green-500') : ''
    
    return `${baseStyle} ${hoverStyle} ${selectedStyle}`
  }

  const equityChartData = React.useMemo(() => {
    if (!dayData?.trades?.length) return []

    // Sort trades by entry time
    const sortedTrades = [...dayData.trades].sort((a, b) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    )

    // Calculate running balance
    let runningBalance = 0
    return sortedTrades.map((trade, index) => {
      runningBalance += (trade.pnl - (trade.commission || 0))
      return {
        time: new Date(trade.entryDate).toLocaleTimeString(),
        balance: runningBalance,
        pnl: trade.pnl - (trade.commission || 0),
        tradeNumber: index + 1,
      }
    })
  }, [dayData?.trades])

  const CustomEquityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="text-sm font-medium">{`Time: ${data.time}`}</p>
          <p className="text-sm font-medium">{`Trade #: ${data.tradeNumber}`}</p>
          <p className={`text-sm font-medium ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {`Trade P&L: ${formatCurrency(data.pnl)}`}
          </p>
          <p className={`text-sm font-medium ${data.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {`Balance: ${formatCurrency(data.balance)}`}
          </p>
        </div>
      )
    }
    return null
  }

  if (!dayData?.trades?.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('calendar.charts.noTradeData')}</p>
      </div>
    )
  }

  // Calculate final P&L for each account (including commissions)
  const accountPnL = dayData.trades.reduce((acc, trade) => {
    const accountNumber = trade.accountNumber || 'Unknown'
    // Add commission to P&L calculation
    const totalPnL = trade.pnl - (trade.commission || 0)
    acc[accountNumber] = (acc[accountNumber] || 0) + totalPnL
    return acc
  }, {} as Record<string, number>)

  // Convert to chart data format
  const chartData = Object.entries(accountPnL).map(([account, pnl]) => ({
    name: `Account ${account}`,
    value: pnl,
    account,
  }))

  // Sort by absolute value for better visualization
  chartData.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  const totalPnL = chartData.reduce((sum, item) => sum + item.value, 0)

  // Generate colors based on theme
  const colors = isDarkMode 
    ? ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6']  // Dark mode colors
    : ['#a78bfa', '#818cf8', '#60a5fa', '#38bdf8', '#22d3ee', '#2dd4bf']  // Light mode colors

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const data = payload[0].payload
      const percentage = data.account !== 'total' 
        ? ((data.value / totalPnL) * 100).toFixed(1)
        : '100'
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{data.name}</p>
          <p className={`font-bold ${data.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.value)}
          </p>
          {data.account !== 'total' && (
            <p className="text-sm text-muted-foreground">
              {percentage}% {t('calendar.charts.ofTotal')}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Calculate average time in position
  const avgTimeInPosition = dayData?.trades?.length
    ? dayData.trades.reduce((sum, trade) => sum + trade.timeInPosition, 0) / dayData.trades.length
    : 0

  // Calculate common Y-axis domain for both charts
  const calculateCommonDomain = React.useMemo(() => {
    if (!dayData?.trades?.length) return [0, 0];
    
    // Get min/max from P&L distribution
    const distributionValues = Object.values(accountPnL);
    const distributionMin = Math.min(...distributionValues);
    const distributionMax = Math.max(...distributionValues);

    // Get min/max from equity chart
    const equityMin = Math.min(
      ...equityChartData.map(d => Math.min(d.pnl, d.balance))
    );
    const equityMax = Math.max(
      ...equityChartData.map(d => Math.max(d.pnl, d.balance))
    );

    // Get the overall min/max
    const overallMin = Math.min(distributionMin, equityMin);
    const overallMax = Math.max(distributionMax, equityMax);
    
    // Add some padding (10%)
    const padding = (overallMax - overallMin) * 0.1;
    return [
      Math.floor((overallMin - padding) / 100) * 100,
      Math.ceil((overallMax + padding) / 100) * 100
    ];
  }, [dayData?.trades, accountPnL, equityChartData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex-1">
            <CardTitle className="text-lg">{t('calendar.charts.dailyPnlAfterComm')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 mt-auto">
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
              {formatCurrency(totalPnL)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('calendar.charts.across')} {Object.keys(accountPnL).length} {Object.keys(accountPnL).length > 1 
                ? t('calendar.charts.accounts') 
                : t('calendar.charts.account')}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex-1">
            <CardTitle className="text-lg">{t('calendar.charts.avgTimeInPosition')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 mt-auto">
            <p className="text-2xl font-bold">
              {formatDuration(avgTimeInPosition)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('calendar.charts.over')} {dayData.trades.length} {dayData.trades.length > 1 
                ? t('calendar.charts.trades') 
                : t('calendar.charts.trade')}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex-1">
            <CardTitle className="text-lg">{t('calendar.charts.howWasYourDay')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 mt-auto">
            <div className="flex justify-around items-center">
              <Button
                variant="ghost"
                size="lg"
                className={getMoodButtonStyle('bad')}
                onClick={() => handleMoodSelect('bad')}
                disabled={isLoading !== null}
              >
                <FaRegSadTear className={`h-6 w-6 ${isLoading === 'bad' ? 'animate-pulse' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={getMoodButtonStyle('okay')}
                onClick={() => handleMoodSelect('okay')}
                disabled={isLoading !== null}
              >
                <FaRegMeh className={`h-6 w-6 ${isLoading === 'okay' ? 'animate-pulse' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={getMoodButtonStyle('great')}
                onClick={() => handleMoodSelect('great')}
                disabled={isLoading !== null}
              >
                <FaRegSmileBeam className={`h-6 w-6 ${isLoading === 'great' ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('calendar.charts.equityVariation')}</CardTitle>
          <CardDescription>
            {t('calendar.charts.finalBalance')}: {formatCurrency(equityChartData[equityChartData.length - 1]?.balance || 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={equityChartData}
                margin={{ top: 20, right: 40, left: 60, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(time) => time.split(':').slice(0, 2).join(':')}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => formatCurrency(value)}
                  domain={calculateCommonDomain}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => formatCurrency(value)}
                  domain={calculateCommonDomain}
                />
                <Tooltip content={<CustomEquityTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="pnl"
                  name={t('calendar.charts.tradePnl')}
                  opacity={0.8}
                >
                  {equityChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      className="transition-all duration-300 ease-in-out hover:opacity-70"
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="stepAfter"
                  dataKey="balance"
                  stroke={chartConfig.equity.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={t('calendar.charts.balance')}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('calendar.charts.dailyPnlDistribution')}</CardTitle>
          <CardDescription>
            {t('calendar.charts.totalPnlAfterComm')}: {formatCurrency(totalPnL)}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] h-full pb-24">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 40, left: 60, bottom: 100 }}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  type="category" 
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  height={100}
                  interval={0}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          dy={8}
                          dx={-8}
                          textAnchor="end"
                          transform="rotate(-45)"
                          className="text-[10px] fill-current"
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis 
                  type="number"
                  tickFormatter={(value) => formatCurrency(value)}
                  domain={calculateCommonDomain}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  barSize={20}
                  name={t('calendar.charts.accountPnl')}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value >= 0 ? colors[index % colors.length] : `hsl(var(--destructive))`}
                      className="transition-all duration-300 ease-in-out hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}