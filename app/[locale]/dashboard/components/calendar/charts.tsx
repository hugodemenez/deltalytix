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
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { useTheme } from "@/context/theme-provider"
import { useI18n, useCurrentLocale } from '@/locales/client'

interface ChartsProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
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

export function Charts({ dayData, isWeekly = false }: ChartsProps) {
  const { effectiveTheme } = useTheme()
  const isDarkMode = effectiveTheme === 'dark'
  const t = useI18n()
  const locale = useCurrentLocale()
  
  // Calculate data for charts
  const { accountPnL, equityChartData, chartData, totalPnL, calculateCommonDomain } = React.useMemo(() => {
    if (!dayData?.trades?.length) {
      return {
        accountPnL: {},
        equityChartData: [],
        chartData: [],
        totalPnL: 0,
        calculateCommonDomain: [0, 0] as [number, number]
      };
    }

    // Calculate P&L for each account
    const accountPnL = dayData.trades.reduce((acc, trade) => {
      const accountNumber = trade.accountNumber || 'Unknown'
      const totalPnL = trade.pnl - (trade.commission || 0)
      acc[accountNumber] = (acc[accountNumber] || 0) + totalPnL
      return acc
    }, {} as Record<string, number>);

    // Convert to chart data format and sort
    const chartData = Object.entries(accountPnL)
      .map(([account, pnl]) => ({
        name: account,
        value: pnl,
        account,
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const totalPnL = chartData.reduce((sum, item) => sum + item.value, 0);

    // Calculate equity chart data
    const equityChartData = [...dayData.trades]
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
      .map((trade, index) => {
        const runningBalance = dayData.trades
          .slice(0, index + 1)
          .reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0);
        return {
          time: new Date(trade.entryDate).toLocaleTimeString(locale),
          date: new Date(trade.entryDate).toLocaleDateString(locale, { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
          }),
          balance: runningBalance,
          pnl: trade.pnl - (trade.commission || 0),
          tradeNumber: index + 1,
        }
      });

    // Calculate common domain
    const distributionValues = Object.values(accountPnL);
    const distributionMin = Math.min(...distributionValues);
    const distributionMax = Math.max(...distributionValues);

    const equityMin = Math.min(
      ...equityChartData.map(d => Math.min(d.pnl, d.balance))
    );
    const equityMax = Math.max(
      ...equityChartData.map(d => Math.max(d.pnl, d.balance))
    );

    const overallMin = Math.min(distributionMin, equityMin);
    const overallMax = Math.max(distributionMax, equityMax);
    
    const padding = (overallMax - overallMin) * 0.1;
    const calculateCommonDomain = [
      Math.floor((overallMin - padding) / 100) * 100,
      Math.ceil((overallMax + padding) / 100) * 100
    ] as [number, number];

    return {
      accountPnL,
      equityChartData,
      chartData,
      totalPnL,
      calculateCommonDomain
    };
  }, [dayData?.trades, locale]);

  if (!dayData?.trades?.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('calendar.charts.noTradeData')}</p>
      </div>
    )
  }

  // Generate colors based on theme
  const colors = isDarkMode 
    ? ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6']  // Dark mode colors
    : ['#a78bfa', '#818cf8', '#60a5fa', '#38bdf8', '#22d3ee', '#2dd4bf']  // Light mode colors

  const EquityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-xs text-xs md:text-sm">
          <p className="font-semibold">{isWeekly ? data.date : data.time}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className={`font-bold ${entry.dataKey === 'pnl' ? (entry.value >= 0 ? 'text-green-600' : 'text-red-600') : 'text-blue-600'}`}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="text-muted-foreground text-xs">
            {t('calendar.charts.tradeNumber')}: {data.tradeNumber}
          </p>
        </div>
      )
    }
    return null
  }

  const DistributionTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const data = payload[0].payload
      const percentage = data.account !== 'total' 
        ? ((data.value / totalPnL) * 100).toFixed(1)
        : '100'
      return (
        <div className="bg-background p-2 border rounded shadow-xs text-xs md:text-sm">
          <p className="font-semibold">{data.name}</p>
          <p className={`font-bold ${data.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.value)}
          </p>
          {data.account !== 'total' && (
            <p className="text-muted-foreground">
              {percentage}% {t('calendar.charts.ofTotal')}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            {isWeekly ? t('calendar.charts.weeklyEquityVariation') : t('calendar.charts.equityVariation')}
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {t('calendar.charts.finalBalance')}: {formatCurrency(equityChartData[equityChartData.length - 1]?.balance || 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] md:h-[250px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={equityChartData}
                margin={{ 
                  top: 10, 
                  right: 8, 
                  left: 35, 
                  bottom: 40 
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey={isWeekly ? "date" : "time"}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                  tick={{ fontSize: '10px' }}
                  tickFormatter={(value) => {
                    if (isWeekly) {
                      return value;
                    }
                    const [hours, minutes] = value.split(':');
                    return `${hours}:${minutes}`;
                  }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  domain={calculateCommonDomain}
                  tick={{ fontSize: '10px' }}
                  width={50}
                />
                <Tooltip 
                  content={<EquityTooltip />}
                  wrapperStyle={{ zIndex: 1000 }}
                  cursor={{ strokeWidth: 2 }}
                />
                <Bar
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
                  type="stepAfter"
                  dataKey="balance"
                  stroke={chartConfig.equity.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  name={t('calendar.charts.balance')}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            {isWeekly ? t('calendar.charts.weeklyPnlDistribution') : t('calendar.charts.dailyPnlDistribution')}
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {isWeekly ? t('calendar.charts.weeklyTotalPnlAfterComm') : t('calendar.charts.totalPnlAfterComm')}: {formatCurrency(totalPnL)}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] md:h-[300px] pb-8 md:pb-16">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ 
                  top: 10, 
                  right: 16, 
                  left: 35, 
                  bottom: 60 
                }}
                barCategoryGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  type="category" 
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  height={60}
                  interval={0}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          dy={8}
                          dx={-4}
                          textAnchor="end"
                          transform="rotate(-45)"
                          className="text-[8px] md:text-[10px] fill-current"
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
                  tick={{ fontSize: '10px' }}
                  width={50}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  content={<DistributionTooltip />}
                  wrapperStyle={{ zIndex: 1000 }}
                  cursor={{ fillOpacity: 0.3 }}
                />
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