'use client'

import { useUserData } from '@/components/context/user-data'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowLeftRight, ArrowUpFromLine, ArrowDownFromLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'

interface LongShortPerformanceCardProps {
  size?: WidgetSize
}

export default function LongShortPerformanceCard({ size = 'medium' }: LongShortPerformanceCardProps) {
  const { calendarData } = useUserData()

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

  if (size === 'tiny') {
    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <div className="flex items-center gap-1">
            <ArrowUpFromLine className="h-3 w-3 text-green-500" />
            <span className="font-medium text-sm">{longRate}%</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1">
            <ArrowDownFromLine className="h-3 w-3 text-red-500" />
            <span className="font-medium text-sm">{shortRate}%</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          (size === 'small' || size === 'small-long')
            ? "p-2" 
            : "p-4 sm:p-6"
        )}
      >
        <CardTitle 
          className={cn(
            "line-clamp-1",
            (size === 'small' || size === 'small-long') ? "text-sm" : "text-base sm:text-lg"
          )}
        >
          Long/Short Performance
        </CardTitle>
        <ArrowLeftRight className={cn(
          "text-muted-foreground",
          (size === 'small' || size === 'small-long') ? "h-4 w-4" : "h-5 w-5"
        )} />
      </CardHeader>
      <CardContent 
        className={cn(
          (size === 'small' || size === 'small-long') ? "p-2" : "p-4 sm:p-6"
        )}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className={cn(
              "font-bold flex items-center gap-1",
              (size === 'small' || size === 'small-long') ? "text-lg" : "text-2xl"
            )}>
              <ArrowUpFromLine className="h-4 w-4 text-green-500" />
              {longRate}%
            </div>
            <div className={cn(
              "text-muted-foreground",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>
              Long ({longNumber})
            </div>
          </div>
          <div>
            <div className={cn(
              "font-bold flex items-center gap-1",
              (size === 'small' || size === 'small-long') ? "text-lg" : "text-2xl"
            )}>
              <ArrowDownFromLine className="h-4 w-4 text-red-500" />
              {shortRate}%
            </div>
            <div className={cn(
              "text-muted-foreground",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>
              Short ({shortNumber})
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}