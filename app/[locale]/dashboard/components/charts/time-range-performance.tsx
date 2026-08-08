"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

import { useData } from "@/context/data-provider"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useCurrentLocale, useI18n } from "@/locales/client"
import { Trade } from "@/prisma/generated/prisma/browser"
import { Button } from "@/components/ui/button"
import { getTimeRangeKey } from "@/lib/time-range"

import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_TIME_RANGE,
} from "./chart-loading-skeleton"
import {
  WidgetBody,
  WidgetCard,
  WidgetChartGrid,
  WidgetChartInteractive,
  WidgetEmpty,
  WidgetFooter,
  WidgetHeader,
  WidgetTooltip,
  WidgetZeroLine,
  axisProps,
  chartColors,
  chartMargin,
  formatCompactCurrency,
  formatCount,
  formatCurrency,
  formatPercent,
  isCompactSize,
  pnlTone,
  pnlToneClass,
} from "../widgets"

interface TimeRangePerformanceChartProps {
  size?: WidgetSize
}

interface TimeRangeRow {
  range: string
  avgPnl: number
  winRate: number
  trades: number
  color: string
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

/**
 * Bar color states whether the bucket wins more often than it loses. It is
 * always paired with the numeric win rate in the tooltip, so the meaning never
 * rests on color alone.
 */
function getColorByWinRate(winRate: number, trades: number): string {
  if (trades === 0) return chartColors.neutral
  return winRate >= 50 ? chartColors.win : chartColors.loss
}

export default function TimeRangePerformanceChart({ size = 'medium' }: TimeRangePerformanceChartProps) {
  const { formattedTrades: trades, timeRange, setTimeRange, isLoading } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()
  const compact = isCompactSize(size)
  const [activeRange, setActiveRange] = React.useState<string | null>(null)

  const chartData = React.useMemo<TimeRangeRow[]>(() => {
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
        color: getColorByWinRate(winRate, data.totalTrades)
      }
    })
  }, [trades])

  // Bar length is a magnitude encoding, so the domain always contains zero and
  // the headroom only ever extends away from the baseline.
  const yDomain = React.useMemo<[number, number]>(() => {
    const values = chartData.map((row) => row.avgPnl)
    if (values.length === 0) return [0, 0]
    return [
      Math.min(Math.min(...values) * 1.1, 0),
      Math.max(Math.max(...values) * 1.1, 0),
    ]
  }, [chartData])

  const totalTrades = React.useMemo(
    () => chartData.reduce((sum, row) => sum + row.trades, 0),
    [chartData],
  )

  const handleClick = React.useCallback(() => {
    if (!activeRange) return
    if (timeRange.range === activeRange) {
      setTimeRange({ range: null })
    } else {
      setTimeRange({ range: activeRange })
    }
  }, [activeRange, timeRange.range, setTimeRange])

  const hasData = totalTrades > 0

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('timeRangePerformance.title')}
        description={t('timeRangePerformance.description')}
        actions={
          timeRange.range ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-normal text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out hover:text-foreground"
              onClick={() => setTimeRange({ range: null })}
            >
              {t('timeRangePerformance.clearFilter')}
            </Button>
          ) : null
        }
      />
      <WidgetBody size={size} className="min-h-0">
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_TIME_RANGE}
            xDataKey="range"
            yDataKey="avgPnl"
            yAxisWidth={45}
            showReferenceLine
          />
        ) : !hasData ? (
          <WidgetEmpty size={size} message={t('widgets.empty.noTrades')} />
        ) : (
          <WidgetChartInteractive
            onActivate={handleClick}
            label={`${t('timeRangePerformance.title')}. ${t('timeRangePerformance.description')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={chartMargin(size)}>
                <WidgetChartGrid />
                <XAxis
                  dataKey="range"
                  {...axisProps(size)}
                  height={compact ? 32 : 24}
                  angle={compact ? -45 : 0}
                  textAnchor={compact ? 'end' : 'middle'}
                  interval={0}
                  tickFormatter={getTimeRangeLabel}
                />
                <YAxis
                  {...axisProps(size)}
                  width={compact ? 44 : 52}
                  domain={yDomain}
                  tickFormatter={(value: number) => formatCompactCurrency(value, locale)}
                />
                <WidgetZeroLine />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  isAnimationActive={false}
                  content={({ active, payload }: any) => {
                    const row: TimeRangeRow | undefined = active && payload?.length
                      ? payload[0].payload
                      : undefined
                    // Recharts owns hover state; mirror it so a click knows the target.
                    if ((row?.range ?? null) !== activeRange) {
                      setActiveRange(row?.range ?? null)
                    }
                    if (!row) return null
                    return (
                      <WidgetTooltip
                        title={getTimeRangeLabel(row.range)}
                        rows={[
                          {
                            label: t('timeRangePerformance.tooltip.avgPnl'),
                            value: formatCurrency(row.avgPnl, locale),
                            toneClassName: pnlToneClass(pnlTone(row.avgPnl)),
                          },
                          {
                            label: t('timeRangePerformance.tooltip.winRate'),
                            value: formatPercent(row.winRate, locale),
                          },
                          {
                            label: t('timeRangePerformance.tooltip.timeRange'),
                            value: row.trades === 1
                              ? t('timeRangePerformance.tooltip.trades.one', { count: row.trades })
                              : t('timeRangePerformance.tooltip.trades.other', { count: formatCount(row.trades, locale) }),
                          },
                        ]}
                        caption={
                          timeRange.range === row.range
                            ? t('timeRangePerformance.clearFilter')
                            : undefined
                        }
                      />
                    )
                  }}
                />
                <Bar
                  dataKey="avgPnl"
                  fill={chartColors.neutral}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={compact ? 25 : 40}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.range}`}
                      fill={entry.color}
                      // Dimming is the selection state, not decoration.
                      opacity={
                        timeRange.range && timeRange.range !== entry.range ? 0.3 : 1
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </WidgetChartInteractive>
        )}
      </WidgetBody>
      <WidgetFooter size={size}>
        <span>USD</span>
        <span className="tabular-nums">
          {formatCount(totalTrades, locale)} {t('tickDistribution.tooltip.trades')}
        </span>
      </WidgetFooter>
    </WidgetCard>
  )
}
