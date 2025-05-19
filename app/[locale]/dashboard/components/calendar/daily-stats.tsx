"use client"

import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { useI18n } from '@/locales/client'
import { DailyMood } from './daily-mood'

interface DailyStatsProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
}

const formatCurrency = (value: number | undefined | null) => {
  if (value == null) return '$0.00'
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

export function DailyStats({ dayData, isWeekly = false }: DailyStatsProps) {
  const t = useI18n()

  // Calculate stats
  const { totalPnL, avgTimeInPosition, accountCount } = React.useMemo(() => {
    if (!dayData?.trades?.length) {
      return {
        totalPnL: 0,
        avgTimeInPosition: 0,
        accountCount: 0
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

    return {
      totalPnL,
      avgTimeInPosition,
      accountCount
    }
  }, [dayData?.trades])

  if (!dayData?.trades?.length) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="flex flex-col">
          <CardHeader className="pb-1 flex-1">
            <CardTitle className="text-base md:text-lg">
              {isWeekly ? t('calendar.charts.weeklyPnlAfterComm') : t('calendar.charts.dailyPnlAfterComm')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 mt-auto">
            <p className={`text-xl md:text-2xl font-bold ${totalPnL >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
              {formatCurrency(totalPnL)}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {t('calendar.charts.across')} {accountCount} {accountCount > 1 
                ? t('calendar.charts.accounts') 
                : t('calendar.charts.account')}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-1 flex-1">
            <CardTitle className="text-base md:text-lg">
              {isWeekly ? t('calendar.charts.weeklyAvgTimeInPosition') : t('calendar.charts.avgTimeInPosition')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 mt-auto">
            <p className="text-xl md:text-2xl font-bold">
              {formatDuration(avgTimeInPosition)}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {t('calendar.charts.over')} {dayData.trades.length} {dayData.trades.length > 1 
                ? t('calendar.charts.trades') 
                : t('calendar.charts.trade')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 