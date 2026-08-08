"use client"

import React from 'react'
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { useCurrentLocale, useI18n } from '@/locales/client'
import {
  WidgetMetric,
  formatCount,
  formatCurrency,
  formatDuration,
  pnlTone,
  pnlToneClass,
} from "../widgets"

interface DailyStatsProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
}

export function DailyStats({ dayData, isWeekly = false }: DailyStatsProps) {
  const t = useI18n()
  const locale = useCurrentLocale()

  // Calculate stats
  const { totalPnL, avgTimeInPosition, accountCount, maxDrawdown, maxProfit } = React.useMemo(() => {
    if (!dayData?.trades?.length) {
      return {
        totalPnL: 0,
        avgTimeInPosition: 0,
        accountCount: 0,
        maxDrawdown: 0,
        maxProfit: 0
      }
    }

    // Calculate P&L for each account
    const accountPnL = dayData.trades.reduce((acc, trade) => {
      const accountNumber = trade.accountNumber || 'Unknown'
      const totalPnL = trade.pnl - (trade.commission || 0)
      acc[accountNumber] = (acc[accountNumber] || 0) + totalPnL
      return acc
    }, {} as Record<string, number>)

    const totalPnL = Object.values(accountPnL).reduce((sum, pnl) => sum + pnl, 0)
    const avgTimeInPosition = dayData.trades.reduce((sum, trade) => sum + trade.timeInPosition, 0) / dayData.trades.length
    const accountCount = Object.keys(accountPnL).length

    // Add sorting and equity curve
    const sortedTrades = dayData.trades.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    const equity = [0];
    let cumulative = 0;
    sortedTrades.forEach(trade => {
      cumulative += trade.pnl - (trade.commission || 0);
      equity.push(cumulative);
    });

    // Calculate max drawdown
    let peak = -Infinity;
    let maxDD = 0;
    equity.forEach(val => {
      if (val > peak) peak = val;
      const dd = peak - val;
      if (dd > maxDD) maxDD = dd;
    });

    // Calculate max runup (profit)
    let trough = Infinity;
    let maxRU = 0;
    equity.forEach(val => {
      if (val < trough) trough = val;
      const ru = val - trough;
      if (ru > maxRU) maxRU = ru;
    });

    return {
      totalPnL,
      avgTimeInPosition,
      accountCount,
      maxDrawdown: maxDD,
      maxProfit: maxRU
    }
  }, [dayData?.trades])

  if (!dayData?.trades?.length) {
    return null
  }

  const tradeCount = dayData.trades.length

  /*
   * The modal is already a surface: these four figures are a stat row separated
   * by spacing, not four nested cards. Only the P&L values carry tone, and each
   * one keeps its sign so the color is never the only signal.
   */
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
      <WidgetMetric
        size="small"
        label={isWeekly ? t('calendar.charts.weeklyPnlAfterComm') : t('calendar.charts.dailyPnlAfterComm')}
        value={formatCurrency(totalPnL, locale)}
        toneClassName={pnlToneClass(pnlTone(totalPnL))}
        caption={`${t('calendar.charts.across')} ${formatCount(accountCount, locale)} ${accountCount > 1
          ? t('calendar.charts.accounts')
          : t('calendar.charts.account')}`}
      />

      <WidgetMetric
        size="small"
        label={isWeekly ? t('calendar.charts.weeklyAvgTimeInPosition') : t('calendar.charts.avgTimeInPosition')}
        value={formatDuration(avgTimeInPosition)}
        caption={`${t('calendar.charts.over')} ${formatCount(tradeCount, locale)} ${tradeCount > 1
          ? t('calendar.charts.trades')
          : t('calendar.charts.trade')}`}
      />

      <WidgetMetric
        size="small"
        label={isWeekly ? t('calendar.charts.weeklyMaxDrawdown') : t('calendar.charts.dailyMaxDrawdown')}
        value={formatCurrency(-maxDrawdown, locale)}
        toneClassName={pnlToneClass(pnlTone(-maxDrawdown))}
      />

      <WidgetMetric
        size="small"
        label={isWeekly ? t('calendar.charts.weeklyMaxProfit') : t('calendar.charts.dailyMaxProfit')}
        value={formatCurrency(maxProfit, locale)}
        toneClassName={pnlToneClass(pnlTone(maxProfit))}
      />
    </div>
  )
}
