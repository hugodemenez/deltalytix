'use client'

import { useTradeStatistics } from "@/components/context/trades-data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TradePerformanceCardProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'small-long'
}

export default function TradePerformanceCard({ size = 'medium' }: TradePerformanceCardProps) {
  const { statistics: { nbWin, nbLoss, nbBe, nbTrades } } = useTradeStatistics()

  // Calculate rates
  const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
  const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
  const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

  if (size === 'tiny') {
    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="font-medium text-sm">{winRate}%</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1">
            <Minus className="h-3 w-3 text-yellow-500" />
            <span className="font-medium text-sm">{beRate}%</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span className="font-medium text-sm">{lossRate}%</span>
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
          Trade Performance
        </CardTitle>
        <BarChart className={cn(
          "text-muted-foreground",
          (size === 'small' || size === 'small-long') ? "h-4 w-4" : "h-5 w-5"
        )} />
      </CardHeader>
      <CardContent 
        className={cn(
          (size === 'small' || size === 'small-long') ? "p-2" : "p-4 sm:p-6"
        )}
      >
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className={cn(
              "font-bold flex items-center gap-1",
              (size === 'small' || size === 'small-long') ? "text-lg" : "text-2xl"
            )}>
              <TrendingUp className="h-4 w-4 text-green-500" />
              {winRate}%
            </div>
            <div className={cn(
              "text-muted-foreground",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>
              Win Rate
            </div>
          </div>
          <div>
            <div className={cn(
              "font-bold flex items-center gap-1",
              (size === 'small' || size === 'small-long') ? "text-lg" : "text-2xl"
            )}>
              <Minus className="h-4 w-4 text-yellow-500" />
              {beRate}%
            </div>
            <div className={cn(
              "text-muted-foreground",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>
              BE Rate
            </div>
          </div>
          <div>
            <div className={cn(
              "font-bold flex items-center gap-1",
              (size === 'small' || size === 'small-long') ? "text-lg" : "text-2xl"
            )}>
              <TrendingDown className="h-4 w-4 text-red-500" />
              {lossRate}%
            </div>
            <div className={cn(
              "text-muted-foreground",
              (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
            )}>
              Loss Rate
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}