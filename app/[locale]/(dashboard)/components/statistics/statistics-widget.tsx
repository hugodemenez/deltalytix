"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTradeStatistics, useCalendarData } from "@/components/context/trades-data"
import { Clock, PiggyBank, Award, BarChart } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface StatisticsWidgetProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function StatisticsWidget({ size = 'medium' }: StatisticsWidgetProps) {
  const { statistics } = useTradeStatistics()
  const { calendarData } = useCalendarData()
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null)
  const [isTouch, setIsTouch] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const lastTouchTime = React.useRef(0)

  // Calculate statistics
  const { 
    nbWin, nbLoss, nbBe, nbTrades, 
    averagePositionTime, 
    cumulativePnl, cumulativeFees,
    winningStreak 
  } = statistics

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

  // Colors
  const positiveColor = "hsl(var(--chart-2))"
  const negativeColor = "hsl(var(--chart-1))"
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

  // Tooltip handlers
  const handleTooltipToggle = React.useCallback((name: string) => {
    setActiveTooltip(prev => prev === name ? null : name)
  }, [])

  const debouncedTooltipToggle = React.useMemo(
    () => debounce((name: string) => {
      handleTooltipToggle(name)
    }, 300),
    [handleTooltipToggle]
  )

  const handleTouchStart = React.useCallback((name: string, e: React.TouchEvent) => {
    e.preventDefault()
    const now = Date.now()
    if (now - lastTouchTime.current > 300) {
      debouncedTooltipToggle(name)
      lastTouchTime.current = now
    }
  }, [debouncedTooltipToggle])

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
    <Card className="h-full" ref={cardRef}>
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b",
          (size === 'small' || size === 'small-long')
            ? "p-2" 
            : "p-4 sm:p-6"
        )}
      >
        <div className="flex items-center justify-between">
          <CardTitle 
            className={cn(
              "line-clamp-1",
              (size === 'small' || size === 'small-long') ? "text-sm" : "text-base sm:text-lg"
            )}
          >
            Trading Statistics
          </CardTitle>
          <BarChart className={cn(
            "text-muted-foreground",
            (size === 'small' || size === 'small-long') ? "h-4 w-4" : "h-5 w-5"
          )} />
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Overview of your trading performance
        </CardDescription>
      </CardHeader>
      <CardContent 
        className={cn(
          "grid gap-2",
          size === 'small' 
            ? "p-2 grid-cols-2 grid-rows-2" 
            : size === 'small-long'
            ? "p-2 grid-cols-4"
            : "p-4 sm:p-6 grid-cols-2 sm:grid-cols-4"
        )}
      >
        {/* Performance Distribution - Only show for medium and large */}
        {size !== 'small' && size !== 'small-long' && (
          <div className="col-span-2">
            <TooltipProvider delayDuration={0}>
              <div className="space-y-2">
                <div className="text-sm font-medium">Performance Distribution</div>
                <div className="relative h-4">
                  {performanceData.map((entry, index) => {
                    const prevTotal = performanceData.slice(0, index).reduce((sum, d) => sum + d.value, 0)
                    return (
                      <Tooltip key={entry.name} open={activeTooltip === `perf-${entry.name}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-0 h-4 cursor-pointer transition-opacity ${index === 0 ? 'rounded-l-sm' : ''} ${index === performanceData.length - 1 ? 'rounded-r-sm' : ''}`}
                            style={{
                              left: `${prevTotal}%`,
                              width: `${entry.value}%`,
                              backgroundColor: entry.color,
                            }}
                            onClick={() => !isTouch && handleTooltipToggle(`perf-${entry.name}`)}
                            onMouseEnter={() => !isTouch && setActiveTooltip(`perf-${entry.name}`)}
                            onMouseLeave={() => !isTouch && setActiveTooltip(null)}
                            onTouchStart={(e) => handleTouchStart(`perf-${entry.name}`, e)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{entry.name}: {entry.value.toFixed(2)}%</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Long/Short Distribution - Only show for medium and large */}
        {size !== 'small' && size !== 'small-long' && (
          <div className="col-span-2">
            <TooltipProvider delayDuration={0}>
              <div className="space-y-2">
                <div className="text-sm font-medium">Long/Short Distribution</div>
                <div className="relative h-4">
                  {sideData.map((entry, index) => {
                    const prevTotal = sideData.slice(0, index).reduce((sum, d) => sum + d.value, 0)
                    return (
                      <Tooltip key={entry.name} open={activeTooltip === `side-${entry.name}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-0 h-4 cursor-pointer transition-opacity ${index === 0 ? 'rounded-l-sm' : ''} ${index === sideData.length - 1 ? 'rounded-r-sm' : ''}`}
                            style={{
                              left: `${prevTotal}%`,
                              width: `${entry.value}%`,
                              backgroundColor: entry.color,
                            }}
                            onClick={() => !isTouch && handleTooltipToggle(`side-${entry.name}`)}
                            onMouseEnter={() => !isTouch && setActiveTooltip(`side-${entry.name}`)}
                            onMouseLeave={() => !isTouch && setActiveTooltip(null)}
                            onTouchStart={(e) => handleTouchStart(`side-${entry.name}`, e)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{entry.name}: {entry.value.toFixed(2)}% ({entry.number} trades)</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Key Metrics - 2x2 grid for small size */}
        <div className={cn(
          "space-y-1",
          size === 'small' ? "col-span-1" : size === 'small-long' ? "col-span-1" : "col-span-1"
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              "font-medium",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>P/L</div>
          </div>
          <div className={cn(
            "font-bold",
            (size === 'small' || size === 'small-long') ? "text-sm" : "text-xl"
          )}>
            ${(cumulativePnl - cumulativeFees).toFixed(2)}
          </div>
        </div>

        <div className={cn(
          "space-y-1",
          size === 'small' ? "col-span-1" : size === 'small-long' ? "col-span-1" : "col-span-1"
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              "font-medium",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>Win Rate</div>
          </div>
          <div className={cn(
            "font-bold",
            (size === 'small' || size === 'small-long') ? "text-sm" : "text-xl"
          )}>
            {winRate}%
          </div>
        </div>

        {/* Show these metrics for both small and other sizes now */}
        <div className={cn(
          "space-y-1",
          size === 'small' ? "col-span-1" : size === 'small-long' ? "col-span-1" : "col-span-1"
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              "font-medium",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>Avg Time</div>
          </div>
          <div className={cn(
            "font-bold",
            (size === 'small' || size === 'small-long') ? "text-sm" : "text-xl"
          )}>
            {averagePositionTime}
          </div>
        </div>

        <div className={cn(
          "space-y-1",
          size === 'small' ? "col-span-1" : size === 'small-long' ? "col-span-1" : "col-span-1"
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              "font-medium",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>Trades</div>
          </div>
          <div className={cn(
            "font-bold",
            (size === 'small' || size === 'small-long') ? "text-sm" : "text-xl"
          )}>
            {nbTrades}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 