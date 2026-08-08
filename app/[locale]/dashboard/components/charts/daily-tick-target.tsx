"use client"

import * as React from "react"
import { Target, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { useDailyTickTargetStore } from "@/store/widgets/daily-tick-target-store"
import { useTickDetailsStore } from "@/store/tick-details-store"
import { useEffect, useState } from "react"
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetFooter,
  WidgetHeader,
  WidgetMetric,
  WidgetStat,
  WidgetStatList,
  formatCount,
  formatPercent,
  formatTicks,
  isCompactSize,
  pnlTone,
  pnlToneClass,
  widgetType,
} from "../widgets"

interface DailyTickTargetProps {
  size?: WidgetSize
}

/** Local calendar date, so a trade never slides into the wrong day via UTC. */
function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DailyTickTargetChart({ size = 'medium' }: DailyTickTargetProps) {
  const { formattedTrades: trades, dateRange } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()
  const tickDetails = useTickDetailsStore(state => state.tickDetails)
  const [targetValue, setTargetValue] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const compact = isCompactSize(size)

  const {
    getTodayTarget,
    getTodayProgress,
    setTarget,
    updateCurrent,
    displayMode,
    setDisplayMode,
    convertToDisplayValue,
    convertFromDisplayValue,
    getDisplayUnit,
    getTarget, // Added getTarget
    getProgress // Added getProgress
  } = useDailyTickTargetStore()

  // The period this widget answers for: the active date filter, or today.
  const period = React.useMemo(() => {
    if (dateRange && dateRange.from) {
      const from = formatLocalDate(dateRange.from)
      return { from, to: dateRange.to ? formatLocalDate(dateRange.to) : from }
    }
    const today = formatLocalDate(new Date())
    return { from: today, to: today }
  }, [dateRange])

  // The from date is the key the target is stored under.
  const selectedDate = period.from

  // Use selectedDate for fetching progress
  const todayTarget = getTarget(selectedDate)
  const progress = getProgress(selectedDate) || { current: 0, target: 0, percentage: 0, positive: 0, negative: 0, total: 0 }

  // Calculate the period's ticks from trades
  const breakdown = React.useMemo(() => {
    // Filter trades for the selected period (even if trades array is empty)
    const displayTrades = trades.filter(trade => {
      // Validate that entryDate exists and is valid
      if (!trade.entryDate) return false

      const entryDate = new Date(trade.entryDate)
      if (isNaN(entryDate.getTime())) return false

      const tradeDate = entryDate.toISOString().split('T')[0]
      // Check if trade date is within the range
      return tradeDate >= period.from && tradeDate <= period.to
    })

    // Calculate ticks breakdown for the period (even if no trades)
    let totalTicks = 0
    let positiveTicks = 0
    let negativeTicks = 0
    let totalAbsoluteTicks = 0
    let tradeCount = 0

    displayTrades.forEach(trade => {
      // Validate required fields
      if (!trade.pnl || !trade.quantity || !trade.instrument) return

      // Fix ticker matching logic - sort by length descending to match longer tickers first
      const matchingTicker = Object.keys(tickDetails)
        .sort((a, b) => b.length - a.length)
        .find(ticker => trade.instrument.includes(ticker))

      // Use tickValue (monetary value per tick) instead of tickSize (minimum price increment)
      const tickValue = matchingTicker ? tickDetails[matchingTicker].tickValue : 1

      // Calculate PnL per contract first. Guarded so a zero quantity can never
      // reach the widget as NaN or Infinity.
      const quantity = Number(trade.quantity)
      if (!quantity) return
      const pnlPerContract = Number(trade.pnl) / quantity
      if (!Number.isFinite(pnlPerContract) || !tickValue) return

      const ticks = Math.round(pnlPerContract / tickValue)
      if (Number.isFinite(ticks)) {
        tradeCount += 1
        totalTicks += ticks
        totalAbsoluteTicks += Math.abs(ticks)

        if (ticks > 0) {
          positiveTicks += ticks
        } else {
          negativeTicks += ticks
        }
      }
    })

    return { totalTicks, positiveTicks, negativeTicks, totalAbsoluteTicks, tradeCount }
  }, [trades, tickDetails, period])

  // Always update current ticks for the period with breakdown (even if zero)
  useEffect(() => {
    updateCurrent(
      period.from,
      breakdown.totalTicks,
      breakdown.positiveTicks,
      breakdown.negativeTicks,
      breakdown.totalAbsoluteTicks,
    )
  }, [period.from, breakdown, updateCurrent])

  const handleSaveTarget = () => {
    const targetDate = selectedDate
    const displayValue = parseInt(targetValue) || 0
    const tickValue = convertFromDisplayValue(displayValue)
    setTarget(targetDate, tickValue)
    setTargetValue('')
    setIsDialogOpen(false)
  }

  const handleQuickIncrement = (increment: number) => {
    const targetDate = selectedDate
    const currentTarget = todayTarget?.target || 0
    const displayIncrement = convertFromDisplayValue(increment)
    const newTarget = Math.max(0, currentTarget + displayIncrement)
    setTarget(targetDate, newTarget)
  }

  const isTargetSet = Boolean(todayTarget && todayTarget.target > 0)
  const isOverTarget = progress.current > progress.target && progress.target > 0

  const unitLabel =
    displayMode === 'points'
      ? t('widgets.dailyTickTarget.displayMode.points')
      : t('widgets.dailyTickTarget.displayMode.ticks')

  // One precision for every peer figure on the widget: points can land on a
  // quarter, ticks are whole.
  const formatUnit = React.useCallback(
    (ticks: number) =>
      formatTicks(convertToDisplayValue(ticks), locale, {
        maximumFractionDigits: displayMode === 'points' ? 2 : 0,
      }),
    [convertToDisplayValue, displayMode, locale],
  )

  const periodLabel =
    period.from === period.to ? period.from : `${period.from} - ${period.to}`

  const actions = (
    <>
      {/* Points/Ticks Toggle */}
      <TooltipProvider>
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-xs",
                  displayMode === 'ticks' ? "font-medium" : "text-muted-foreground",
                )}
              >
                {t('widgets.dailyTickTarget.displayMode.ticks')}
              </span>
              <Switch
                checked={displayMode === 'points'}
                onCheckedChange={(checked) => setDisplayMode(checked ? 'points' : 'ticks')}
                aria-label={t('widgets.dailyTickTarget.displayMode.tooltip')}
                className="h-4 w-8"
              />
              <span
                className={cn(
                  "text-xs",
                  displayMode === 'points' ? "font-medium" : "text-muted-foreground",
                )}
              >
                {t('widgets.dailyTickTarget.displayMode.points')}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t('widgets.dailyTickTarget.displayMode.tooltip')}</p>
          </TooltipContent>
        </UITooltip>
      </TooltipProvider>

      {/* Target controls */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleQuickIncrement(-1)}
        aria-label={`${t('widgets.dailyTickTarget.target')} -1 ${unitLabel}`}
        className="h-6 w-6 p-0"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleQuickIncrement(1)}
        aria-label={`${t('widgets.dailyTickTarget.target')} +1 ${unitLabel}`}
        className="h-6 w-6 p-0"
      >
        <Plus className="h-3 w-3" />
      </Button>

      {/* Target setting dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('widgets.dailyTickTarget.setTarget')}
            className="h-6 w-6 p-0"
          >
            <Target className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-balance">{t('widgets.dailyTickTarget.setTarget')}</DialogTitle>
            <DialogDescription className="text-pretty">
              {t('widgets.dailyTickTarget.setTargetDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                {t('widgets.dailyTickTarget.target')} ({unitLabel})
              </label>
              <Input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={Math.round(convertToDisplayValue(progress.target)).toString()}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveTarget}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

  const hasEvidence = breakdown.tradeCount > 0 || isTargetSet

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('widgets.dailyTickTarget.title')}
        description={t('widgets.dailyTickTarget.tooltip')}
        actions={actions}
      />
      {!hasEvidence ? (
        <WidgetEmpty
          size={size}
          className="flex-1"
          message={t('widgets.dailyTickTarget.noTargetSet')}
        />
      ) : (
        <WidgetBody size={size} className="flex flex-col justify-center gap-4">
          {/* The focal figure, at full precision, with its target beneath it. */}
          <WidgetMetric
            size={size}
            label={t('widgets.dailyTickTarget.current')}
            value={`${formatUnit(progress.current)} ${unitLabel}`}
            toneClassName={pnlToneClass(pnlTone(progress.current))}
            caption={
              isTargetSet
                ? `${t('widgets.dailyTickTarget.target')} ${formatUnit(progress.target)} ${unitLabel}`
                : t('widgets.dailyTickTarget.noTargetSet')
            }
          />

          {/* Breakdown: the sign sits on the number, color only reinforces it. */}
          <WidgetStatList>
            <WidgetStat
              label={t('widgets.dailyTickTarget.positive')}
              value={formatUnit(progress.positive)}
              toneClassName={pnlToneClass(pnlTone(progress.positive))}
            />
            <WidgetStat
              label={t('widgets.dailyTickTarget.negative')}
              value={formatUnit(progress.negative)}
              toneClassName={pnlToneClass(pnlTone(progress.negative))}
            />
            <WidgetStat
              label={t('widgets.dailyTickTarget.total')}
              value={formatUnit(progress.total)}
            />
          </WidgetStatList>

          {/* Progress toward the target: a completion share, so it runs from zero. */}
          {isTargetSet ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className={widgetType.label}>
                  {t('widgets.dailyTickTarget.progress')}
                </span>
                <span
                  className={cn(
                    widgetType.value,
                    "shrink-0 text-right",
                    isOverTarget ? pnlToneClass('positive') : undefined,
                  )}
                >
                  {formatPercent(progress.percentage, locale, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <Progress
                value={progress.percentage}
                className={cn(compact ? "h-1.5" : "h-2")}
                aria-label={t('widgets.dailyTickTarget.progress')}
              />
            </div>
          ) : null}
        </WidgetBody>
      )}
      <WidgetFooter size={size}>
        <span>{unitLabel}</span>
        <span className="tabular-nums">
          {periodLabel} · {formatCount(breakdown.tradeCount, locale)}{" "}
          {t('tickDistribution.tooltip.trades')}
        </span>
      </WidgetFooter>
    </WidgetCard>
  )
}
