"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { InfoBubble } from "@/components/ui/info-bubble"
import { cn, calculateStatistics } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { useBreakevenStore } from "@/store/widgets/breakeven-store"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { Trade } from "@/prisma/generated/prisma/browser"

interface StatisticsWidgetProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'small-long' | 'extra-large'
  dayData?: CalendarEntry // Optional: if provided, show statistics for this specific day only
}

export default function StatisticsWidget({ size = 'medium', dayData }: StatisticsWidgetProps) {
  const dataContext = useData()
  const breakevenRange = useBreakevenStore((state) => state.range)
  const t = useI18n()
  const locale = useCurrentLocale()

  // Number formatter for currency with thousands separators based on locale
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value))
    
    // Always use $ symbol with proper spacing for French
    if (locale === 'fr') {
      return `${formatted} $`
    } else {
      return `$${formatted}`
    }
  }

  const formatSignedCurrency = (value: number) => {
    const sign = value > 0 ? '+' : value < 0 ? '-' : ''
    return `${sign}${formatCurrency(value)}`
  }

  // Calculate statistics - either for a specific day or for all data
  const statistics = React.useMemo(() => {
    if (dayData?.trades) {
      return calculateStatistics(dayData.trades as Trade[], [], breakevenRange)
    }
    return dataContext.statistics
  }, [dayData, dataContext.statistics, breakevenRange])

  const calendarData = React.useMemo(() => {
    if (dayData) {
      // Create a single-day calendarData object
      return {
        'selected-day': {
          pnl: dayData.pnl,
          tradeNumber: dayData.tradeNumber,
          longNumber: dayData.longNumber,
          shortNumber: dayData.shortNumber,
        }
      }
    }
    return dataContext.calendarData
  }, [dayData, dataContext.calendarData])

  const { 
    nbWin, nbTrades,
    averagePositionTime, 
    cumulativePnl, cumulativeFees,
    winningStreak,
    grossLosses,
    grossWin,
    totalPayouts,
    nbPayouts
  } = statistics

  // Calculate Net P&L including payouts
  const netPnlWithPayouts = cumulativePnl - cumulativeFees - totalPayouts

  // Calculate rates
  const winRate = Number((nbWin / nbTrades * 100).toFixed(2))

  // Calculate long/short data
  const chartData = Object.entries(calendarData).map(([date, values]) => ({
    date,
    pnl: values.pnl,
    shortNumber: values.shortNumber,
    longNumber: values.longNumber,
  }))

  const longNumber = chartData.reduce((acc, curr) => acc + curr.longNumber, 0)
  const shortNumber = chartData.reduce((acc, curr) => acc + curr.shortNumber, 0)
  const totalTrades = longNumber + shortNumber
  const longRate = Number((longNumber / totalTrades * 100).toFixed(2))
  const shortRate = Number((shortNumber / totalTrades * 100).toFixed(2))

  // Calculate average win/loss based on daily P&L
  // For single day mode, use the day's P&L directly; for multi-day, calculate average
  const avgWinPerDay = React.useMemo(() => {
    if (dayData) {
      // Single day: if positive, show the day's P&L; otherwise 0
      return dayData.pnl > 0 ? dayData.pnl : 0
    }
    const winningDays = chartData.filter(day => day.pnl > 0)
    return winningDays.length > 0 
      ? winningDays.reduce((sum, day) => sum + day.pnl, 0) / winningDays.length 
      : 0
  }, [dayData, chartData])

  const avgLossPerDay = React.useMemo(() => {
    if (dayData) {
      // Single day: if negative, show absolute value; otherwise 0
      return dayData.pnl < 0 ? Math.abs(dayData.pnl) : 0
    }
    const losingDays = chartData.filter(day => day.pnl < 0)
    return losingDays.length > 0 
      ? Math.abs(losingDays.reduce((sum, day) => sum + day.pnl, 0) / losingDays.length)
      : 0
  }, [dayData, chartData])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex-none border-b",
          size === 'tiny' 
            ? "py-1 px-2"
            : (size === 'small' || size === 'small-long')
              ? "py-2 px-3" 
              : "py-3 px-4"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'tiny'
                  ? "text-xs"
                  : (size === 'small' || size === 'small-long') 
                    ? "text-sm" 
                    : "text-base"
              )}
            >
              {t('statistics.title')}
            </CardTitle>
            <InfoBubble iconClassName="size-3.5">
              <p>{t('statistics.tooltip')}</p>
            </InfoBubble>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="grid h-full grid-cols-2">
          {/* Profit/Loss Section */}
          <div className={cn(
            "flex flex-col border-r border-b",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-[-0.02em]">{t('statistics.profitLoss.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5">
              {/* Profits */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.profitLoss.profits')}</span>
                <span className="text-xs font-medium text-[#3E7550] tabular-nums">
                  {formatSignedCurrency(Math.abs(grossWin))}
                </span>
              </div>
              
              {/* Losses */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.profitLoss.losses')}</span>
                <span className="text-xs font-medium text-[#B55742] tabular-nums">
                  {formatSignedCurrency(-Math.abs(grossLosses))}
                </span>
              </div>
              
              {/* Fees */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.profitLoss.fees')}</span>
                <span className="text-xs font-medium text-[#B55742] tabular-nums">
                  {formatSignedCurrency(-Math.abs(cumulativeFees))}
                </span>
              </div>
              
              {/* Payouts */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.profitLoss.payouts')} ({nbPayouts})</span>
                <span className="text-xs font-medium text-[#B55742] tabular-nums">
                  {formatSignedCurrency(-Math.abs(totalPayouts))}
                </span>
              </div>
              
              {/* Divider */}
              <div className="border-t border-dashed my-1"></div>
              
              {/* Net Result */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs font-medium">{t('statistics.profitLoss.net')}</span>
                <span className={cn(
                  "text-sm font-semibold tabular-nums",
                  netPnlWithPayouts > 0
                    ? "text-[#3E7550]"
                    : netPnlWithPayouts < 0
                      ? "text-[#B55742]"
                      : "text-foreground"
                )}>
                  {formatSignedCurrency(netPnlWithPayouts)}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Section */}
          <div className={cn(
            "flex flex-col border-b",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-[-0.02em]">{t('statistics.performance.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.performance.winRate')}</span>
                <span className="text-sm font-medium tabular-nums">{winRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">{t('statistics.performance.avgWin')}</span>
                  <InfoBubble iconClassName="size-3">
                    <p>{t('statistics.performance.avgWinTooltip')}</p>
                  </InfoBubble>
                </div>
                <span className="text-sm font-medium text-[#3E7550] tabular-nums">
                  {formatSignedCurrency(Math.abs(avgWinPerDay))}
                </span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs">{t('statistics.performance.avgLoss')}</span>
                    <InfoBubble iconClassName="size-3">
                      <p>{t('statistics.performance.avgLossTooltip')}</p>
                    </InfoBubble>
                  </div>
                  <span className="text-sm font-medium text-[#B55742] tabular-nums">
                    {formatSignedCurrency(-Math.abs(avgLossPerDay))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Section */}
          <div className={cn(
            "flex flex-col border-r",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-[-0.02em]">{t('statistics.activity.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.activity.totalTrades')}</span>
                <span className="text-sm font-medium tabular-nums">{nbTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.activity.winningTrades')}</span>
                <span className="text-sm font-medium tabular-nums">{nbWin}</span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.activity.avgDuration')}</span>
                  <span className="text-sm font-medium tabular-nums">{averagePositionTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Distribution Section */}
          <div className={cn(
            "flex flex-col",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-[-0.02em]">{t('statistics.distribution.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.distribution.long')}</span>
                <span className="text-sm font-medium tabular-nums">{longRate}%</span>
              </div>
              {size !== 'tiny' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{t('statistics.distribution.short')}</span>
                    <span className="text-sm font-medium tabular-nums">{shortRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{t('statistics.distribution.winningStreak')}</span>
                    <span className="text-sm font-medium tabular-nums">{winningStreak}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.distribution.winningStreak')}</span>
                  <span className="text-sm font-medium tabular-nums">{winningStreak}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
