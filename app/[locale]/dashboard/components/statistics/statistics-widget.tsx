"use client"

import * as React from "react"
import { useData } from "@/context/data-provider"
import { cn, calculateStatistics } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { useBreakevenStore } from "@/store/widgets/breakeven-store"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { Trade } from "@/prisma/generated/prisma/browser"
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetHeader,
  WidgetSection,
  WidgetStat,
  WidgetStatList,
  formatCount,
  formatCurrency,
  formatDuration,
  formatPercent,
  pnlTone,
  pnlToneClass,
} from "../widgets"

interface StatisticsWidgetProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'small-long' | 'extra-large'
  dayData?: CalendarEntry // Optional: if provided, show statistics for this specific day only
}

export default function StatisticsWidget({ size = 'medium', dayData }: StatisticsWidgetProps) {
  const dataContext = useData()
  const breakevenRange = useBreakevenStore((state) => state.range)
  const t = useI18n()
  const locale = useCurrentLocale()

  // Calculate statistics - either for a specific day or for all data
  const statistics = React.useMemo(() => {
    if (dayData?.trades) {
      return calculateStatistics(dayData.trades as Trade[], [], breakevenRange)
    }
    return dataContext.statistics
  }, [dayData, dataContext.statistics, breakevenRange])

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
    totalPositionTime,
    cumulativePnl, cumulativeFees,
    winningStreak,
    grossLosses,
    grossWin,
    totalPayouts,
    nbPayouts
  } = statistics

  // Calculate Net P&L including payouts
  const netPnlWithPayouts = cumulativePnl - cumulativeFees - totalPayouts

  // Calculate rates. Guarded: dividing by an empty dataset used to render "NaN%".
  const winRate = nbTrades > 0 ? (nbWin / nbTrades) * 100 : 0
  const lossRate = nbTrades > 0 ? (nbLoss / nbTrades) * 100 : 0
  const beRate = nbTrades > 0 ? (nbBe / nbTrades) * 100 : 0
  const averagePositionSeconds = nbTrades > 0 ? totalPositionTime / nbTrades : 0

  // Calculate long/short data
  const chartData = React.useMemo(
    () => Object.entries(calendarData).map(([date, values]) => ({
      date,
      pnl: values.pnl,
      shortNumber: values.shortNumber,
      longNumber: values.longNumber,
    })),
    [calendarData],
  )

  const longNumber = chartData.reduce((acc, curr) => acc + curr.longNumber, 0)
  const shortNumber = chartData.reduce((acc, curr) => acc + curr.shortNumber, 0)
  const totalTrades = longNumber + shortNumber
  const longRate = totalTrades > 0 ? (longNumber / totalTrades) * 100 : 0
  const shortRate = totalTrades > 0 ? (shortNumber / totalTrades) * 100 : 0

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

  const isTiny = size === 'tiny'

  // Deductions carry their own minus sign, so the tone color is never the only
  // thing telling the reader the figure works against them.
  const losses = -grossLosses
  const fees = -cumulativeFees
  const payouts = -totalPayouts
  const avgLoss = -avgLossPerDay

  if (nbTrades === 0) {
    return (
      <WidgetCard>
        <WidgetHeader
          size={size}
          title={t('statistics.title')}
          description={t('statistics.tooltip')}
        />
        <WidgetEmpty
          size={size}
          className="flex-1"
          message={t('widgets.empty.noTrades')}
        />
      </WidgetCard>
    )
  }

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('statistics.title')}
        description={t('statistics.tooltip')}
      />
      <WidgetBody size={size} className="overflow-y-auto">
        {/* Four groups, read as groups through spacing and alignment. The card
            border is the only border; no quadrant boxes inside it. */}
        <div className={cn("grid grid-cols-2", isTiny ? "gap-x-3 gap-y-3" : "gap-x-6 gap-y-4")}>
          <WidgetSection title={t('statistics.profitLoss.title')} className="gap-1.5">
            <WidgetStatList>
              <WidgetStat
                label={t('statistics.profitLoss.profits')}
                value={formatCurrency(grossWin, locale)}
                toneClassName={pnlToneClass(pnlTone(grossWin))}
              />
              <WidgetStat
                label={t('statistics.profitLoss.losses')}
                value={formatCurrency(losses, locale)}
                toneClassName={pnlToneClass(pnlTone(losses))}
              />
              <WidgetStat
                label={t('statistics.profitLoss.fees')}
                value={formatCurrency(fees, locale)}
                toneClassName={pnlToneClass(pnlTone(fees))}
              />
              <WidgetStat
                label={`${t('statistics.profitLoss.payouts')} (${formatCount(nbPayouts, locale)})`}
                value={formatCurrency(payouts, locale)}
                toneClassName={pnlToneClass(pnlTone(payouts))}
              />
            </WidgetStatList>
            {/* The conclusion of the group. Separated by space, not by a rule. */}
            <WidgetStat
              label={t('statistics.profitLoss.net')}
              value={formatCurrency(netPnlWithPayouts, locale)}
              toneClassName={cn(pnlToneClass(pnlTone(netPnlWithPayouts)), "font-semibold")}
            />
          </WidgetSection>

          <WidgetSection title={t('statistics.performance.title')} className="gap-1.5">
            <WidgetStatList>
              <WidgetStat
                label={t('statistics.performance.winRate')}
                value={formatPercent(winRate, locale)}
              />
              <WidgetStat
                label={t('statistics.performance.avgWin')}
                description={t('statistics.performance.avgWinTooltip')}
                value={formatCurrency(avgWinPerDay, locale)}
                toneClassName={pnlToneClass(pnlTone(avgWinPerDay))}
              />
              {!isTiny && (
                <WidgetStat
                  label={t('statistics.performance.avgLoss')}
                  description={t('statistics.performance.avgLossTooltip')}
                  value={formatCurrency(avgLoss, locale)}
                  toneClassName={pnlToneClass(pnlTone(avgLoss))}
                />
              )}
            </WidgetStatList>
          </WidgetSection>

          <WidgetSection title={t('statistics.activity.title')} className="gap-1.5">
            <WidgetStatList>
              <WidgetStat
                label={t('statistics.activity.totalTrades')}
                value={formatCount(nbTrades, locale)}
              />
              <WidgetStat
                label={t('statistics.activity.winningTrades')}
                value={formatCount(nbWin, locale)}
              />
              {!isTiny && (
                <WidgetStat
                  label={t('statistics.activity.avgDuration')}
                  value={formatDuration(averagePositionSeconds)}
                />
              )}
            </WidgetStatList>
          </WidgetSection>

          <WidgetSection title={t('statistics.distribution.title')} className="gap-1.5">
            <WidgetStatList>
              <WidgetStat
                label={t('statistics.distribution.long')}
                value={formatPercent(longRate, locale)}
              />
              {!isTiny && (
                <WidgetStat
                  label={t('statistics.distribution.short')}
                  value={formatPercent(shortRate, locale)}
                />
              )}
              <WidgetStat
                label={t('statistics.distribution.winningStreak')}
                value={formatCount(winningStreak, locale)}
              />
            </WidgetStatList>
          </WidgetSection>
        </div>
      </WidgetBody>
    </WidgetCard>
  )
}
