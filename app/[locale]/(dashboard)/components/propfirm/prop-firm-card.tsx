'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useMemo } from "react"

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

  const { drawdownProgress, remainingLoss, progress, isConfigured } = useMemo(() => {
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
    let currentDrawdownAmount = 0

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

    // Calculate final PnL including payouts
    const totalPnL = runningBalance - account.startingBalance

    if (account.trailingDrawdown) {
      if (totalPnL >= account.trailingStopProfit) {
        // We've hit trailing stop profit - lock the max level
        const maxLevel = account.startingBalance + account.trailingStopProfit
        currentDrawdownAmount = Math.max(0, maxLevel - runningBalance)
      } else if (totalPnL > 0) {
        // In profit but below trailing stop - calculate from highest point
        // For trailing drawdown, consider payouts as drawdown from highest point
        currentDrawdownAmount = Math.max(0, highestBalance - runningBalance)
      } else {
        // In loss - calculate from starting balance
        currentDrawdownAmount = Math.abs(totalPnL)
      }
    } else {
      // For fixed drawdown, only consider losses from starting balance
      if (totalPnL < 0) {
        currentDrawdownAmount = Math.abs(totalPnL)
      } else {
        currentDrawdownAmount = 0
      }
    }

    // Calculate remaining loss before hitting drawdown
    const remainingLoss = account.drawdownThreshold - currentDrawdownAmount

    // Calculate drawdown progress percentage (inverted for visual representation)
    const drawdownProgress = ((account.drawdownThreshold - remainingLoss) / account.drawdownThreshold) * 100

    return { 
      drawdownProgress,
      remainingLoss,
      progress, 
      isConfigured
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
          <span className="text-base font-semibold truncate ml-2">${account.balanceToDate.toFixed(2)}</span>
        </div>
        {isConfigured ? (
          <div className="space-y-2">
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