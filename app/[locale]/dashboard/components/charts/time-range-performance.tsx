"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { useData } from "@/context/data-provider"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useI18n } from "@/locales/client"
import { Trade } from "@/prisma/generated/prisma/browser"
import { Button } from "@/components/ui/button"
import { getTimeRangeKey } from "@/lib/time-range"
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_TIME_RANGE,
} from "./chart-loading-skeleton"
import { namedSignedConclusion } from "./chart-conclusions"
import {
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  CHART_ZERO_LINE_PROPS,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  filterBarOpacity,
  honestSignedDomain,
  signedFill,
} from "./chart-glance"
import { GlanceBar } from "./chart-glance-bar"
import { ChartWidgetFrame } from "./chart-widget-frame"

interface TimeRangePerformanceChartProps {
  size?: WidgetSize
}

function getTimeRangeLabel(range: string): string {
  const labels: Record<string, string> = {
    under1min: '< 1m',
    '1to5min': '1-5m',
    '5to10min': '5-10m',
    '10to15min': '10-15m',
    '15to30min': '15-30m',
    '30to60min': '30-60m',
    '1to2hours': '1-2h',
    '2to5hours': '2-5h',
    over5hours: '> 5h'
  }
  return labels[range] || range
}

function getColorByWinRate(winRate: number): string {
  if (winRate === 0) return "hsl(var(--muted-foreground))"
  return winRate >= 50 ? "hsl(var(--chart-win))" : "hsl(var(--chart-loss))"
}

export default function TimeRangePerformanceChart({ size = 'medium' }: TimeRangePerformanceChartProps) {
  const { formattedTrades: trades, timeRange, setTimeRange, isLoading } = useData()
  const t = useI18n()
  const [activeRange, setActiveRange] = React.useState<string | null>(null)

  const chartData = React.useMemo(() => {
    const timeRangeData: Record<string, {
      totalPnl: number
      winCount: number
      lossCount: number
      totalTrades: number
    }> = {
      under1min: { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '1to5min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '5to10min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '10to15min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '15to30min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '30to60min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '1to2hours': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '2to5hours': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      'over5hours': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 }
    }

    trades.forEach((trade: Trade) => {
      const timeRange = getTimeRangeKey(trade.timeInPosition)
      timeRangeData[timeRange].totalPnl += trade.pnl
      timeRangeData[timeRange].totalTrades++
      if (trade.pnl > 0) {
        timeRangeData[timeRange].winCount++
      } else {
        timeRangeData[timeRange].lossCount++
      }
    })

    return Object.entries(timeRangeData).map(([range, data]) => {
      const winRate = data.totalTrades > 0 ? (data.winCount / data.totalTrades) * 100 : 0
      return {
        range,
        avgPnl: data.totalTrades > 0 ? data.totalPnl / data.totalTrades : 0,
        winRate,
        trades: data.totalTrades,
      }
    })
  }, [trades])

  const conclusion = namedSignedConclusion(
    chartData.map((entry) => ({
      label: getTimeRangeLabel(entry.range),
      value: entry.avgPnl,
    })),
  )
  const subtitle =
    conclusion.kind === "empty"
      ? t("timeRangePerformance.subtitle.empty")
      : t(`timeRangePerformance.subtitle.${conclusion.kind}`, {
          label: conclusion.label,
        })

  const handleClick = React.useCallback(() => {
    if (!activeRange) return
    if (timeRange.range === activeRange) {
      setTimeRange({ range: null })
    } else {
      setTimeRange({ range: activeRange })
    }
  }, [activeRange, timeRange.range, setTimeRange])

  const CustomTooltip = ({ active, payload, label }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length) {
        setActiveRange(payload[0].payload.range)
      } else {
        setActiveRange(null)
      }
    }, [active, payload])

    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className={CHART_TOOLTIP_CLASS}>
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.timeRange')}
              </span>
              <span className={
                timeRange.range === data.range ? "font-bold text-primary" : "font-bold text-muted-foreground"
              }>
                {getTimeRangeLabel(label)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.avgPnl')}
              </span>
              <span className="font-bold">
                {data.avgPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.winRate')}
              </span>
              <span className="font-bold" style={{ color: getColorByWinRate(data.winRate) }}>
                {data.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.trades.one', { count: data.trades })}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.trades === 1 
                  ? t('timeRangePerformance.tooltip.trades.one', { count: data.trades })
                  : t('timeRangePerformance.tooltip.trades.other', { count: data.trades })
                }
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const hasFilter = Boolean(timeRange.range)

  return (
    <ChartWidgetFrame
      size={size}
      title={t('timeRangePerformance.title')}
      subtitle={subtitle}
      description={t('timeRangePerformance.description')}
      contentInteractive
      onContentClick={handleClick}
      actions={
        hasFilter ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={() => setTimeRange({ range: null })}
          >
            {t('timeRangePerformance.clearFilter')}
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <BarChartLoadingSkeleton
          size={size}
          data={LOADING_MOCK_TIME_RANGE}
          xDataKey="range"
          yDataKey="avgPnl"
          yAxisWidth={45}
          showReferenceLine
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={getChartMargins(size, "hourly")}
          >
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={false}
              height={size === "small" ? 20 : 24}
              tickMargin={size === "small" ? 4 : 8}
              tick={(props) => {
                const { x, y, payload } = props;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={size === 'small' ? 8 : 4}
                      textAnchor={size === 'small' ? 'end' : 'middle'}
                      fill="currentColor"
                      fontSize={size === 'small' ? 9 : 11}
                      fontWeight={600}
                      transform={size === 'small' ? 'rotate(-45)' : 'rotate(0)'}
                    >
                      {getTimeRangeLabel(payload.value)}
                    </text>
                  </g>
                );
              }}
              interval="preserveStartEnd"
              allowDataOverflow={true}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={45}
              tickMargin={4}
              tick={chartTickStyle(size)}
              domain={honestSignedDomain(chartData.map((entry) => entry.avgPnl))}
            />
            <ReferenceLine y={0} {...CHART_ZERO_LINE_PROPS} />
            <Tooltip 
              content={<CustomTooltip />}
              wrapperStyle={{
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
            <Bar
              dataKey="avgPnl"
              maxBarSize={chartMaxBarSize(size)}
              shape={<GlanceBar />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.range}`}
                  fill={signedFill(entry.avgPnl)}
                  opacity={filterBarOpacity(
                    timeRange.range === entry.range,
                    hasFilter,
                  )}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  )
}
