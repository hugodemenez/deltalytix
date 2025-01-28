'use client'

import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DailyMetric {
  date: Date
  pnl: number
  totalBalance: number
  percentageOfTarget: number
  isConsistent: boolean
  payout?: {
    id: string
    amount: number
    date: Date
    status: string
  }
}

interface AccountTableProps {
  accountNumber: string
  startingBalance: number
  profitTarget: number
  dailyMetrics: DailyMetric[]
  consistencyPercentage: number
  resetDate?: Date
  hasPendingChanges?: boolean
  onDeletePayout?: (payoutId: string) => Promise<void>
  onEditPayout?: (payout: { id: string, amount: number, date: Date, status: string }) => void
}

export function AccountTable({ 
  accountNumber, 
  startingBalance,
  profitTarget,
  dailyMetrics,
  consistencyPercentage,
  resetDate,
  hasPendingChanges = false,
  onDeletePayout,
  onEditPayout
}: AccountTableProps) {
  const t = useI18n()

  // Check if account is configured and has no pending changes
  const isConfigured = profitTarget > 0 && startingBalance > 0 && !hasPendingChanges

  if (!isConfigured) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            {renderTableHeader()}
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="h-[400px] text-center relative">
                  <div className="absolute inset-0 backdrop-blur-[2px] bg-background/80 flex flex-col items-center justify-center gap-2">
                    <h3 className="font-semibold text-lg">
                      {hasPendingChanges 
                        ? t('propFirm.setup.saveFirst.title') 
                        : t('propFirm.setup.configureFirst.title')}
                    </h3>
                    <p className="text-muted-foreground">
                      {hasPendingChanges 
                        ? t('propFirm.setup.saveFirst.description')
                        : t('propFirm.setup.configureFirst.description')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Sort metrics to ensure they're in chronological order
  const sortedMetrics = [...dailyMetrics].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Split metrics into before and after reset
  const metricsBeforeReset = resetDate 
    ? sortedMetrics.filter(metric => metric.date < resetDate)
    : []
  
  const metricsAfterReset = resetDate
    ? sortedMetrics.filter(metric => metric.date > resetDate)
    : sortedMetrics

  // Calculate total PnL for each period
  const totalPnLBefore = metricsBeforeReset.reduce((sum, metric) => sum + metric.pnl, 0)
  const totalPnLAfter = metricsAfterReset.reduce((sum, metric) => sum + metric.pnl, 0)

  function renderTableHeader() {
    return (
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead>{t('propFirm.dailyStats.date')}</TableHead>
          <TableHead className="text-right">{t('propFirm.dailyStats.pnl')}</TableHead>
          <TableHead className="text-right">{t('propFirm.dailyStats.balance')}</TableHead>
          <TableHead className="text-right">{t('propFirm.dailyStats.target')}</TableHead>
          <TableHead className="text-right">{t('consistency.modal.percentageOfTotal')}</TableHead>
          <TableHead className="text-right">{t('propFirm.dailyStats.status')}</TableHead>
          <TableHead className="text-right">{t('propFirm.dailyStats.payout')}</TableHead>
        </TableRow>
      </TableHeader>
    )
  }

  function renderMetricRow(metric: typeof sortedMetrics[0], runningBalance: number, totalPnL: number) {
    const percentageOfTotal = totalPnL > 0 && metric.pnl > 0 ? (metric.pnl / totalPnL) * 100 : null

    return (
      <TableRow key={metric.date.toISOString()}>
        <TableCell>{format(metric.date, 'PP')}</TableCell>
        <TableCell className={cn(
          "text-right font-medium",
          metric.pnl > 0 ? "text-green-500" : metric.pnl < 0 ? "text-destructive" : ""
        )}>
          ${metric.pnl.toFixed(2)}
        </TableCell>
        <TableCell className="text-right">
          ${runningBalance.toFixed(2)}
        </TableCell>
        <TableCell className="text-right">
          {((runningBalance - startingBalance) / profitTarget * 100).toFixed(1)}%
        </TableCell>
        <TableCell className="text-right">
          {percentageOfTotal !== null ? `${percentageOfTotal.toFixed(1)}%` : '-'}
        </TableCell>
        <TableCell className={cn(
          "text-right font-medium",
          !metric.isConsistent ? "text-destructive" : "text-green-500"
        )}>
          {metric.isConsistent ? t('propFirm.status.consistent') : t('propFirm.status.inconsistent')}
        </TableCell>
        <TableCell className="text-right">
          {metric.payout && (
            <div className="flex items-center justify-end gap-2">
              <div 
                className={cn(
                  "flex items-center gap-2 relative group",
                  onEditPayout && "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                onClick={() => onEditPayout?.(metric.payout!)}
              >
                <span className={cn(
                  metric.payout.status === 'PAID' && "text-destructive font-medium"
                )}>
                  -${metric.payout.amount.toFixed(2)}
                </span>
                <Badge 
                  variant={metric.payout.status === 'PENDING' ? 'secondary' : 'default'}
                  className={cn(
                    onDeletePayout && "pr-6"
                  )}
                >
                  {metric.payout.status}
                  {onDeletePayout && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-6 p-0 hover:bg-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeletePayout(metric.payout!.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              </div>
            </div>
          )}
        </TableCell>
      </TableRow>
    )
  }

  function renderTotalRow(metrics: typeof sortedMetrics, totalPnL: number, runningBalance: number) {
    return (
      <TableRow className="bg-muted/50 font-medium">
        <TableCell>{t('calendar.modal.total')}</TableCell>
        <TableCell className={cn(
          "text-right",
          totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-destructive" : ""
        )}>
          ${totalPnL.toFixed(2)}
        </TableCell>
        <TableCell className="text-right">
          ${runningBalance.toFixed(2)}
        </TableCell>
        <TableCell className="text-right">
          {((runningBalance - startingBalance) / profitTarget * 100).toFixed(1)}%
        </TableCell>
        <TableCell className="text-right">
          {totalPnL > 0 ? '100%' : '-'}
        </TableCell>
        <TableCell className={cn(
          "text-right",
          metrics.some(d => !d.isConsistent) ? "text-destructive" : "text-green-500"
        )}>
          {metrics.some(d => !d.isConsistent) ? 
            t('consistency.inconsistent') : 
            t('consistency.consistent')
          }
        </TableCell>
        <TableCell className="text-right">
          -${metrics.reduce((sum, metric) => 
            sum + (metric.payout?.status === 'PAID' ? metric.payout.amount : 0), 0).toFixed(2)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-8">
      {resetDate && metricsBeforeReset.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium text-muted-foreground">
            {t('propFirm.beforeReset')}
          </div>
          <div className="rounded-md border">
            <Table>
              {renderTableHeader()}
              <TableBody>
                {(() => {
                  let runningBalance = startingBalance
                  return metricsBeforeReset.map(metric => {
                    runningBalance += metric.pnl
                    if (metric.payout?.status === 'PAID') {
                      runningBalance -= metric.payout.amount
                    }
                    return renderMetricRow(metric, runningBalance, totalPnLBefore)
                  })
                })()}
                {renderTotalRow(metricsBeforeReset, totalPnLBefore, metricsBeforeReset.reduce((balance, metric) => {
                  balance += metric.pnl
                  if (metric.payout?.status === 'PAID') {
                    balance -= metric.payout.amount
                  }
                  return balance
                }, startingBalance))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {resetDate && (
        <div className="rounded-md border bg-yellow-100/50 dark:bg-yellow-900/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{t('propFirm.resetDate.label')}</div>
              <div className="text-sm text-muted-foreground">{format(resetDate, 'PP')}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">{t('propFirm.startingBalance')}</div>
              <div className="font-medium">${startingBalance.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      <div>
        {resetDate && (
          <div className="mb-2 text-sm font-medium text-muted-foreground">
            {t('propFirm.afterReset')}
          </div>
        )}
        <div className="rounded-md border">
          <Table>
            {renderTableHeader()}
            <TableBody>
              {(() => {
                let runningBalance = startingBalance
                return metricsAfterReset.map(metric => {
                  runningBalance += metric.pnl
                  if (metric.payout?.status === 'PAID') {
                    runningBalance -= metric.payout.amount
                  }
                  return renderMetricRow(metric, runningBalance, totalPnLAfter)
                })
              })()}
              {renderTotalRow(metricsAfterReset, totalPnLAfter, metricsAfterReset.reduce((balance, metric) => {
                balance += metric.pnl
                if (metric.payout?.status === 'PAID') {
                  balance -= metric.payout.amount
                }
                return balance
              }, startingBalance))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
} 
