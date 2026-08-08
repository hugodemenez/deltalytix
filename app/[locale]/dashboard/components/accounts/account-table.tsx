'use client'

import { format } from "date-fns"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fr, enUS } from 'date-fns/locale'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import {
  formatCurrency,
  formatPercent,
  formatTicks,
  pnlTone,
  pnlToneClass,
  widgetType,
} from "../widgets"

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
  onEditPayout?: (payout: { id: string, amount: number, date: Date, status: string, propfirmSharingPercentage?: number | null }) => void
}

/** Every numeric column is right-aligned in both the head and the body. */
const numericCell = "text-right tabular-nums"

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
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS

  // Helper function to safely calculate percentage of target
  const calculatePercentageOfTarget = (runningBalance: number, startingBalance: number, profitTarget: number) => {
    if (profitTarget <= 0) return '-'
    return formatPercent((runningBalance - startingBalance) / profitTarget * 100, locale)
  }

  // Check if account is configured and has no pending changes
  const isConfigured = !hasPendingChanges

  if (!isConfigured) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table className="min-w-[760px]">
            <TableCaption className="sr-only">
              {t('propFirm.dailyStats.title')} {accountNumber}
            </TableCaption>
            {renderTableHeader()}
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="h-[400px] text-center relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background">
                    <h3 className="text-sm font-medium">
                      {hasPendingChanges
                        ? t('propFirm.setup.saveFirst.title')
                        : t('propFirm.setup.configureFirst.title')}
                    </h3>
                    <p className={widgetType.label}>
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
          <TableHead className={numericCell}>{t('propFirm.dailyStats.pnl')}</TableHead>
          <TableHead className={numericCell}>{t('propFirm.dailyStats.balance')}</TableHead>
          <TableHead className={numericCell}>{t('propFirm.dailyStats.target')}</TableHead>
          <TableHead className={numericCell}>{t('propFirm.consistency.modal.percentageOfTotal')}</TableHead>
          <TableHead className={numericCell}>{t('propFirm.dailyStats.maxAllowed')}</TableHead>
          <TableHead>{t('propFirm.dailyStats.status')}</TableHead>
          <TableHead className={numericCell}>{t('propFirm.dailyStats.payout')}</TableHead>
        </TableRow>
      </TableHeader>
    )
  }

  function renderMetricRow(metric: typeof sortedMetrics[0], runningBalance: number, totalPnL: number) {
    // Calculate total payouts for the entire period (not just up to this date)
    const totalPayouts = sortedMetrics
      .filter(m => m.payout?.status === 'PAID')
      .reduce((sum, m) => sum + (m.payout?.amount || 0), 0)

    // Calculate running profits up to this date
    const profitsUpToDate = sortedMetrics
      .filter(m => m.date <= metric.date)
      .reduce((sum, m) => sum + m.pnl, 0)

    // Calculate profits after all payouts
    const profitsAfterPayouts = profitsUpToDate - totalPayouts

    // Calculate the base amount for consistency (profit target until exceeded)
    const baseAmount = profitsAfterPayouts <= profitTarget ? profitTarget : profitsAfterPayouts
    const maxAllowedDailyProfit = baseAmount * (consistencyPercentage / 100)
    const isConsistent = metric.pnl <= maxAllowedDailyProfit

    const percentageOfTotal = totalPnL > 0 && metric.pnl > 0 ? (metric.pnl / totalPnL) * 100 : null

    return (
      <TableRow key={metric.date.toISOString()}>
        <TableCell>{format(metric.date, 'PP', { locale: dateLocale })}</TableCell>
        {/* The sign travels with the figure, so the tone is never the only cue. */}
        <TableCell className={cn(numericCell, "font-medium", pnlToneClass(pnlTone(metric.pnl)))}>
          {formatCurrency(metric.pnl, locale)}
        </TableCell>
        <TableCell className={numericCell}>
          {formatCurrency(runningBalance, locale)}
        </TableCell>
        <TableCell className={numericCell}>
          {calculatePercentageOfTarget(runningBalance, startingBalance, profitTarget)}
        </TableCell>
        <TableCell className={numericCell}>
          {percentageOfTotal !== null ? formatPercent(percentageOfTotal, locale) : '-'}
        </TableCell>
        <TableCell className={cn(numericCell, "font-medium")}>
          {formatCurrency(maxAllowedDailyProfit, locale)}
        </TableCell>
        <TableCell className={cn("font-medium", !isConsistent && "text-destructive")}>
          {isConsistent ? t('propFirm.status.consistent') : t('propFirm.status.inconsistent')}
        </TableCell>
        <TableCell className={numericCell}>
          {metric.payout && (
            <div className="flex items-center justify-end gap-2">
              <div
                className={cn(
                  "flex items-center justify-end gap-2",
                  onEditPayout && "cursor-pointer motion-safe:transition-opacity hover:opacity-80"
                )}
                onClick={() => onEditPayout?.(metric.payout!)}
              >
                {/* A payout leaves the account, so it carries its own minus sign.
                    Its status is ordinary metadata: plain text, not a pill. */}
                <span className="font-medium">
                  {formatCurrency(-metric.payout.amount, locale)}
                </span>
                <span className={widgetType.caption}>
                  {metric.payout.status}
                </span>
              </div>
              {onDeletePayout && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 hover:text-destructive"
                      aria-label={t('propFirm.payout.delete')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('propFirm.payout.delete')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('propFirm.payout.deleteConfirm')} ${formatTicks(metric.payout!.amount, locale, { maximumFractionDigits: 2 })} on {format(metric.payout!.date, 'PP', { locale: dateLocale })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeletePayout(metric.payout!.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('propFirm.payout.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>
    )
  }

  function renderTotalRow(metrics: typeof sortedMetrics, totalPnL: number, runningBalance: number) {
    // Calculate total payouts
    const totalPayouts = metrics.reduce((sum, metric) =>
      sum + (metric.payout?.status === 'PAID' ? metric.payout.amount : 0), 0)

    // Calculate profits after payouts
    const profitsAfterPayouts = totalPnL - totalPayouts

    // Calculate the base amount for consistency (profit target until exceeded)
    const baseAmount = profitsAfterPayouts <= profitTarget ? profitTarget : profitsAfterPayouts
    const maxAllowedDailyProfit = baseAmount * (consistencyPercentage / 100)

    // Check if any daily PnL exceeds the max allowed
    const hasInconsistentDays = metrics.some(metric => metric.pnl > maxAllowedDailyProfit)

    return (
      <TableRow className="bg-muted/50 font-medium">
        <TableCell>{t('calendar.modal.total')}</TableCell>
        <TableCell className={cn(numericCell, pnlToneClass(pnlTone(totalPnL)))}>
          {formatCurrency(totalPnL, locale)}
        </TableCell>
        <TableCell className={numericCell}>
          {formatCurrency(runningBalance, locale)}
        </TableCell>
        <TableCell className={numericCell}>
          {calculatePercentageOfTarget(runningBalance, startingBalance, profitTarget)}
        </TableCell>
        <TableCell className={numericCell}>
          {totalPnL > 0 ? formatPercent(100, locale) : '-'}
        </TableCell>
        <TableCell className={numericCell}>
          {formatCurrency(maxAllowedDailyProfit, locale)}
        </TableCell>
        <TableCell className={cn(hasInconsistentDays && "text-destructive")}>
          {hasInconsistentDays ?
            t('propFirm.consistency.inconsistent') :
            t('propFirm.consistency.consistent')
          }
        </TableCell>
        <TableCell className={numericCell}>
          {formatCurrency(-totalPayouts, locale)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="min-w-0 space-y-8">
      {resetDate && metricsBeforeReset.length > 0 && (
        <div>
          <div className={cn(widgetType.section, "mb-2")}>
            {t('propFirm.beforeReset')}
          </div>
          <div className="rounded-md border">
            <Table className="min-w-[760px]">
              <TableCaption className="sr-only">
                {t('propFirm.dailyStats.title')} {accountNumber} {t('propFirm.beforeReset')}
              </TableCaption>
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
        /* The reset is a boundary between two periods, not an alarm: it is a
           labelled row of facts, with no color band around it. */
        <div className="rounded-md border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className={widgetType.label}>{t('propFirm.resetDate.label')}</span>
              <span className={widgetType.value}>{format(resetDate, 'PP', { locale: dateLocale })}</span>
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <span className={widgetType.label}>{t('propFirm.startingBalance')}</span>
              <span className={widgetType.value}>{formatCurrency(startingBalance, locale)}</span>
            </div>
          </div>
        </div>
      )}

      <div>
        {resetDate && (
          <div className={cn(widgetType.section, "mb-2")}>
            {t('propFirm.afterReset')}
          </div>
        )}
        <div className="rounded-md border">
          <Table className="min-w-[760px]">
            <TableCaption className="sr-only">
              {t('propFirm.dailyStats.title')} {accountNumber}
            </TableCaption>
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
