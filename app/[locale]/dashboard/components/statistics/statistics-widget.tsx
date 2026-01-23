"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { Clock, PiggyBank, Award, BarChart, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, calculateStatistics } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { Progress } from "@/components/ui/progress"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { Trade } from "@/prisma/generated/prisma/browser"

interface StatisticsWidgetProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'small-long' | 'extra-large'
  dayData?: CalendarEntry // Optional: if provided, show statistics for this specific day only
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function StatisticsWidget({ size = 'medium', dayData }: StatisticsWidgetProps) {
  const dataContext = useData()
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null)
  const [isTouch, setIsTouch] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const lastTouchTime = React.useRef(0)
  const t = useI18n()
  const locale = useCurrentLocale()

  // Number formatter for currency with thousands separators based on locale
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    
    // Always use $ symbol with proper spacing for French
    if (locale === 'fr') {
      return `${formatted} $`
    } else {
      return `$${formatted}`
    }
  }

  // Calculate statistics - either for a specific day or for all data
  const statistics = React.useMemo(() => {
    if (dayData?.trades) {
      // Calculate statistics for this specific day
      return calculateStatistics(dayData.trades as Trade[], [])
    }
    return dataContext.statistics
  }, [dayData, dataContext.statistics])

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
    nbWin, nbLoss, nbBe, nbTrades, 
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
  const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
  const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

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

  // Colors
  const positiveColor = "hsl(var(--chart-win))"
  const negativeColor = "hsl(var(--chart-loss))"
  const neutralColor = "hsl(var(--muted))"

  // Performance data
  const performanceData = [
    { name: 'Win', value: winRate, color: positiveColor },
    { name: 'BE', value: beRate, color: neutralColor },
    { name: 'Loss', value: lossRate, color: negativeColor },
  ]

  // Long/Short data
  const sideData = [
    { name: 'Long', value: longRate, color: positiveColor, number: longNumber },
    { name: 'Short', value: shortRate, color: negativeColor, number: shortNumber },
  ]

  // Touch event handlers
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setActiveTooltip(null)
      }
    }

    const handleTouchStart = () => {
      setIsTouch(true)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    window.addEventListener('touchstart', handleTouchStart, { once: true })

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  return (
    <Card className="h-full flex flex-col" ref={cardRef}>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('statistics.tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <BarChart className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="grid h-full grid-cols-2">
          {/* Profit/Loss Section */}
          <div className={cn(
            "flex flex-col border-r border-b",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1.5">{t('statistics.profitLoss.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5">
              {/* Profits */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.profitLoss.profits')}</span>
                <span className="text-xs font-medium text font-mono">{formatCurrency(grossWin)}</span>
              </div>
              
              {/* Losses */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">- {t('statistics.profitLoss.losses')}</span>
                <span className="text-xs font-medium text-red-500 font-mono">{formatCurrency(grossLosses)}</span>
              </div>
              
              {/* Fees */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">- {t('statistics.profitLoss.fees')}</span>
                <span className="text-xs font-medium text-red-500 font-mono">{formatCurrency(cumulativeFees)}</span>
              </div>
              
              {/* Payouts */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">- {t('statistics.profitLoss.payouts')} ({nbPayouts})</span>
                <span className="text-xs font-medium text-red-500 font-mono">{formatCurrency(totalPayouts)}</span>
              </div>
              
              {/* Divider */}
              <div className="border-t border-dashed my-1"></div>
              
              {/* Net Result */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs font-medium">{t('statistics.profitLoss.net')}</span>
                <span className={cn(
                  "text-sm font-bold font-mono",
                  netPnlWithPayouts > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formatCurrency(netPnlWithPayouts)}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Section */}
          <div className={cn(
            "flex flex-col border-b",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1.5">{t('statistics.performance.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.performance.winRate')}</span>
                <span className="text-sm font-medium">{winRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">{t('statistics.performance.avgWin')}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('statistics.performance.avgWinTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm font-medium text-green-500 font-mono">{formatCurrency(avgWinPerDay)}</span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs">{t('statistics.performance.avgLoss')}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('statistics.performance.avgLossTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-sm font-medium text-red-500 font-mono">-{formatCurrency(avgLossPerDay)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Section */}
          <div className={cn(
            "flex flex-col border-r",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1.5">{t('statistics.activity.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.activity.totalTrades')}</span>
                <span className="text-sm font-medium">{nbTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.activity.winningTrades')}</span>
                <span className="text-sm font-medium text-green-500">{nbWin}</span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.activity.avgDuration')}</span>
                  <span className="text-sm font-medium">{averagePositionTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Distribution Section */}
          <div className={cn(
            "flex flex-col",
            size === 'tiny' ? "p-1.5" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1.5">{t('statistics.distribution.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.distribution.long')}</span>
                  <span className="text-sm font-medium">{longRate}%</span>
                </div>
                <Progress value={longRate} className="h-1" />
              </div>
              {size !== 'tiny' ? (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">{t('statistics.distribution.short')}</span>
                      <span className="text-sm font-medium">{shortRate}%</span>
                    </div>
                    <Progress value={shortRate} className="h-1" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{t('statistics.distribution.winningStreak')}</span>
                    <span className="text-sm font-medium">{winningStreak}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.distribution.winningStreak')}</span>
                  <span className="text-sm font-medium">{winningStreak}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 