import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

interface PropFirmCardOverviewProps {
  account: {
    accountNumber: string
    balanceToDate: number
    profitTarget: number
    drawdownThreshold: number
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
  trades: Array<{
    pnl: number
    commission?: number
    entryDate: string
  }>
  onClick: () => void
  metrics?: {
    hasProfitableData: boolean
    isConsistent: boolean
  }
}

export function PropFirmCardOverview({ account, trades, onClick, metrics }: PropFirmCardOverviewProps) {
  const t = useI18n()

  // Calculate current profits and drawdown level
  const { currentBalance, maxDrawdownLevel, distanceToDrawdown } = (() => {
    // Calculate current profits without payouts for drawdown calculation
    const currentProfits = trades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)
    const balanceWithoutPayouts = account.startingBalance + currentProfits
    
    // Calculate total paid payouts
    const totalPayouts = account.payouts
      .filter(p => p.status === 'PAID')
      .reduce((sum, payout) => sum + payout.amount, 0)
    
    // Current balance including payouts
    const currentBalance = balanceWithoutPayouts - totalPayouts

    // Initialize drawdown tracking variables
    let maxBalanceToDate = account.startingBalance
    let maxDrawdownLevel = account.startingBalance - account.drawdownThreshold
    let hasReachedStopProfit = false

    if (account.trailingDrawdown && currentProfits > 0) {
      if (account.trailingStopProfit && currentProfits >= account.trailingStopProfit) {
        // If we've reached stop profit, lock the drawdown level
        if (!hasReachedStopProfit) {
          hasReachedStopProfit = true
          maxDrawdownLevel = account.startingBalance + account.trailingStopProfit - account.drawdownThreshold
        }
      } else if (!hasReachedStopProfit) {
        // Only update drawdown level if we haven't reached stop profit
        if (balanceWithoutPayouts > maxBalanceToDate) {
          maxBalanceToDate = balanceWithoutPayouts
          maxDrawdownLevel = maxBalanceToDate - account.drawdownThreshold
        }
      }
    }

    // Calculate distance to drawdown using current balance with payouts
    const distanceToDrawdown = currentBalance - maxDrawdownLevel

    return {
      currentBalance,
      maxDrawdownLevel,
      distanceToDrawdown
    }
  })()

  // Calculate progress towards profit target
  const progress = account.profitTarget > 0 
    ? (currentBalance / account.profitTarget) * 100
    : 0

  // Calculate percentage of distance to drawdown relative to current balance
  const distancePercentage = (distanceToDrawdown / currentBalance) * 100
  const isConfigured = account.profitTarget > 0 && account.drawdownThreshold > 0

  return (
    <Card 
      className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="flex-1 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="truncate">
              <CardTitle className="text-sm truncate flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  !metrics?.hasProfitableData ? "bg-muted" :
                  !metrics?.isConsistent ? "bg-destructive" : "bg-green-500"
                )} />
                {account.propfirm || "Unnamed Account"}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {account.accountNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">{t('propFirm.balance')}</span>
          <span className="text-base font-semibold truncate ml-2">${currentBalance.toFixed(2)}</span>
        </div>

        {isConfigured ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('propFirm.target')}</span>
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
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('propFirm.drawdown')}</span>
              <span className={cn(
                "font-medium",
                distancePercentage > 3 ? "text-success" :
                distancePercentage > 1 ? "text-warning" : "text-destructive"
              )}>
                ${distanceToDrawdown.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-2">
            {t('propFirm.setup.message')}
          </p>
        )}
      </CardContent>
    </Card>
  )
} 