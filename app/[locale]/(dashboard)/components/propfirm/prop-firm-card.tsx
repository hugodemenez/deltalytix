'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useMemo } from "react"
import { TradeProgressChart } from "./trade-progress-chart"

interface Trade {
  accountNumber: string
  entryDate: string | Date
  pnl: number
  commission?: number
}

interface PropFirmCardProps {
  account: {
    accountNumber: string
    balanceToDate: number
    profitTarget: number
    drawdownThreshold: number
    isPerformance: boolean
    startingBalance: number
    propfirm: string
    trailingDrawdown: boolean
    trailingStopProfit: number
    payouts: Array<{
      id: string
      amount: number
      date: Date
      status: string
    }>
  }
  trades: Trade[]
  metrics?: {
    hasProfitableData: boolean
    isConsistent: boolean
  }
  onClick?: () => void
}

export function PropFirmCard({ account, trades, metrics, onClick }: PropFirmCardProps) {
  const t = useI18n()

  const { drawdownProgress, remainingLoss, progress, isConfigured, currentBalance } = useMemo(() => {
    const isConfigured = account.profitTarget > 0 && account.drawdownThreshold > 0
    const progress = account.profitTarget > 0 
      ? (account.balanceToDate / account.profitTarget) * 100
      : 0

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    )

    // Get valid payouts (PAID or VALIDATED)
    const validPayouts = account.payouts.filter(p => 
      ['PAID', 'VALIDATED'].includes(p.status)
    )

    // Calculate running balance and track highest point
    let runningBalance = account.startingBalance
    let highestBalance = account.startingBalance

    // Process all trades to find highest balance
    for (const trade of sortedTrades) {
      const tradePnL = trade.pnl - (trade.commission || 0)
      runningBalance += tradePnL
      
      if (runningBalance > highestBalance) {
        highestBalance = runningBalance
      }
    }

    // Calculate total payouts
    const totalPayouts = validPayouts.reduce((sum, payout) => sum + payout.amount, 0)
    
    // Adjust running balance for payouts
    runningBalance -= totalPayouts

    // Calculate drawdown level based on trailing or fixed drawdown
    let drawdownLevel
    if (account.trailingDrawdown) {
      const profitMade = Math.max(0, highestBalance - account.startingBalance)
      
      // If we've hit trailing stop profit, lock the drawdown to that level
      if (profitMade >= account.trailingStopProfit) {
        drawdownLevel = (account.startingBalance + account.trailingStopProfit) - account.drawdownThreshold
      } else {
        // Otherwise, drawdown level trails the highest balance
        drawdownLevel = highestBalance - account.drawdownThreshold
      }
    } else {
      // Fixed drawdown - always relative to starting balance
      drawdownLevel = account.startingBalance - account.drawdownThreshold
    }

    // Calculate remaining loss as distance between current balance and drawdown level
    const remainingLoss = Math.max(0, runningBalance - drawdownLevel)

    // Calculate drawdown progress percentage
    const drawdownProgress = ((account.drawdownThreshold - remainingLoss) / account.drawdownThreshold) * 100

    return { 
      drawdownProgress,
      remainingLoss,
      progress, 
      isConfigured,
      currentBalance: runningBalance
    }
  }, [account, trades])

  return (
    <Card 
      className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="flex-none p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="truncate">
              <CardTitle className="text-sm truncate flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  !metrics?.hasProfitableData ? "bg-muted" :
                  !metrics?.isConsistent ? "bg-destructive" : "bg-green-500"
                )} />
                {account.propfirm || t('propFirm.card.unnamedAccount')}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {account.accountNumber}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 pt-0 space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">{t('propFirm.card.balance')}</span>
          <span className="text-base font-semibold truncate ml-2">${currentBalance.toFixed(2)}</span>
        </div>
        {isConfigured ? (
          <div className="space-y-2">
            {/* Trade Progress Chart */}
            <TradeProgressChart
              trades={trades}
              startingBalance={account.startingBalance}
              drawdownThreshold={account.drawdownThreshold}
              profitTarget={account.profitTarget}
              trailingDrawdown={account.trailingDrawdown}
              trailingStopProfit={account.trailingStopProfit}
              payouts={account.payouts}
            />

            {/* Profit Target Section */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('propFirm.card.target')}</span>
                <span>${account.profitTarget.toFixed(2)}</span>
              </div>
              <Progress 
                value={progress} 
                className="h-1.5" 
                indicatorClassName={cn(
                  "transition-colors duration-300",
                  "bg-[hsl(var(--chart-6))]",
                  progress <= 20 ? "opacity-20" :
                  progress <= 40 ? "opacity-40" :
                  progress <= 60 ? "opacity-60" :
                  progress <= 80 ? "opacity-80" :
                  "opacity-100"
                )}
              />
            </div>

            {/* Drawdown Section */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('propFirm.card.drawdown')}</span>
                <span className={cn(
                  "font-medium",
                  remainingLoss > account.drawdownThreshold * 0.5 ? "text-success" :
                  remainingLoss > account.drawdownThreshold * 0.2 ? "text-warning" : "text-destructive"
                )}>
                  {remainingLoss > 0 
                    ? t('propFirm.card.remainingLoss', { amount: remainingLoss.toFixed(2) })
                    : t('propFirm.card.drawdownBreached')}
                </span>
              </div>
              <Progress 
                value={drawdownProgress} 
                className="h-1.5" 
                indicatorClassName={cn(
                  "transition-colors duration-300",
                  "bg-destructive",
                  drawdownProgress <= 20 ? "opacity-20" :
                  drawdownProgress <= 40 ? "opacity-40" :
                  drawdownProgress <= 60 ? "opacity-60" :
                  drawdownProgress <= 80 ? "opacity-80" :
                  "opacity-100"
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t('propFirm.card.maxLoss', { amount: account.drawdownThreshold.toFixed(2) })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-2">
            {t('propFirm.card.needsConfiguration')}
          </p>
        )}
      </CardContent>
    </Card>
  )
} 