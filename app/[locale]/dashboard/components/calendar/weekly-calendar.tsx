'use client'

import React from "react"
import { format, eachWeekOfInterval, getWeek, getMonth, getYear, addDays, startOfYear, endOfYear } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { fr, enUS } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { Trade } from "@/prisma/generated/prisma/browser"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"
import { useI18n, useCurrentLocale } from "@/locales/client"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useUserStore } from "../../../../../store/user-store"
import { CalendarResponsiveOverlay, shouldSuppressCalendarActivation } from "./calendar-responsive-overlay"

const formatCurrency = (value: number, options?: { signed?: boolean }) => {
  const formatted = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  if (options?.signed && value > 0) {
    return `+${formatted}`
  }
  return formatted
}

const formatCurrencyCompact = (value: number) => {
  const absValue = Math.abs(value)
  if (absValue >= 1_000_000) {
    const result = `$${(value / 1_000_000).toFixed(1)}M`
    return value > 0 ? `+${result}` : result
  }
  if (absValue >= 1_000) {
    const result = `$${(value / 1_000).toFixed(1)}K`
    return value > 0 ? `+${result}` : result
  }
  return formatCurrency(value, { signed: true })
}

function ResponsiveCurrency({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <>
      <span className={cn("sm:hidden", className)}>{formatCurrencyCompact(value)}</span>
      <span className={cn("hidden sm:inline", className)}>{formatCurrency(value, { signed: true })}</span>
    </>
  )
}

interface WeeklyCalendarPnlProps {
  calendarData: CalendarData;
  year: number;
}

function WeekDetailContent({
  weekStart,
  pnl,
  trades,
  dateLocale,
  t,
}: {
  weekStart: Date
  pnl: number
  trades: { [key: string]: { trades: Trade[], pnl: number } }
  dateLocale: typeof enUS
  t: ReturnType<typeof useI18n>
}) {
  return (
    <div className="sm:p-4">
      <div className="hidden sm:flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm">
          {format(weekStart, 'MMM d', { locale: dateLocale })} - {format(addDays(weekStart, 6), 'MMM d, yyyy', { locale: dateLocale })}
        </h4>
        <div className={cn(
          "text-sm font-semibold",
          pnl > 0 ? "text-green-600 dark:text-green-400" : pnl < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
        )}>
          {formatCurrency(pnl, { signed: true })}
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto pr-2">
        {Object.entries(trades).length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(trades).map(([date, { trades: dayTrades, pnl: dayPnl }]) => (
              <AccordionItem key={date} value={date}>
                <AccordionTrigger className="px-2 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex flex-col items-start">
                      <h5 className="text-sm font-medium">
                        {format(new Date(date), 'EEEE, MMM d, yyyy', { locale: dateLocale })}
                      </h5>
                      <span className="text-xs text-muted-foreground">
                        {dayTrades.length} {t('calendar.trades')}
                      </span>
                    </div>
                    <div className={cn(
                      "text-sm font-semibold",
                      dayPnl > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {formatCurrency(dayPnl, { signed: true })}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {dayTrades.map((trade, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{trade.instrument}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(trade.entryDate), 'HH:mm', { locale: dateLocale })}
                          </span>
                        </div>
                        <div className={cn(
                          "text-sm font-semibold",
                          trade.pnl > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {formatCurrency(trade.pnl, { signed: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            {t('calendar.noTrades')}
          </div>
        )}
      </div>
    </div>
  )
}

export default function WeeklyCalendarPnl({ calendarData, year }: WeeklyCalendarPnlProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS
  const timezone = useUserStore((state) => state.timezone)

  const yearStartDate = startOfYear(new Date(year, 0, 1));
  const yearEndDate = endOfYear(new Date(year, 0, 1));

  const weeksToDisplay = eachWeekOfInterval(
    { start: yearStartDate, end: yearEndDate },
    { weekStartsOn: 0 }
  );

  function getWeekPnl(weekStart: Date) {
    let total = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const key = formatInTimeZone(day, timezone, 'yyyy-MM-dd')
      if (calendarData[key]) total += calendarData[key].pnl
    }
    return total
  }

  function getWeekTrades(weekStart: Date) {
    const tradesByDay: { [key: string]: { trades: Trade[], pnl: number } } = {}
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const key = formatInTimeZone(day, timezone, 'yyyy-MM-dd')
      if (calendarData[key]) {
        tradesByDay[key] = {
          trades: calendarData[key].trades,
          pnl: calendarData[key].pnl
        }
      }
    }
    return tradesByDay
  }

  function getMonthPnl(monthIndex: number) {
    let total = 0
    const currentMonthWeeks = weeksToDisplay.filter(weekStart => {
      const weekYear = getYear(weekStart);
      if (weekYear === year) {
        return getMonth(weekStart) === monthIndex;
      }
      return monthIndex === 0;
    });
    currentMonthWeeks.forEach(weekStart => {
      total += getWeekPnl(weekStart)
    })
    return total
  }

  const maxWeeks = Math.max(...Array.from({ length: 12 }, (_, i) =>
    weeksToDisplay.filter(ws => {
      const wy = getYear(ws);
      if (wy === year) return getMonth(ws) === i;
      return i === 0;
    }).length
  ));

  return (
    <div className="flex flex-col gap-1 sm:gap-2 p-1 sm:p-2 h-full min-h-0">
      <div
        className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible"
        role="region"
        aria-label={String(year)}
      >
        <div className="min-w-[680px] sm:min-w-0 flex flex-col gap-1 sm:gap-2">
          {/* Month Headers and Totals */}
          <div className="grid grid-cols-12 gap-0.5 sm:gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const monthlyPnl = getMonthPnl(i)
              return (
                <div key={i} className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                  <div className="text-center text-[9px] sm:text-xs font-medium text-muted-foreground truncate">
                    {format(new Date(year, i, 1), 'MMM', { locale: dateLocale })}
                  </div>
                  <div className={cn(
                    "text-center text-[9px] sm:text-xs font-semibold px-0.5 sm:px-1 py-0.5 rounded transition-colors truncate",
                    monthlyPnl > 0
                      ? "text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/30"
                      : monthlyPnl < 0
                        ? "text-red-600 dark:text-red-400/90 bg-red-50/50 dark:bg-red-950/30"
                        : "text-muted-foreground bg-muted/20"
                  )}>
                    <ResponsiveCurrency value={monthlyPnl} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weeks Grid */}
          <div className="grid grid-cols-12 gap-0.5 sm:gap-1 flex-1">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthWeeks = weeksToDisplay.filter(weekStart => {
                const weekYear = getYear(weekStart);
                if (weekYear === year) {
                  return getMonth(weekStart) === monthIndex;
                }
                return monthIndex === 0;
              });

              const allWeeks: (Date | null)[] = [...monthWeeks]
              while (allWeeks.length < maxWeeks) {
                allWeeks.push(null)
              }

              return (
                <div key={monthIndex} className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                  {allWeeks.map((weekStart, weekIndex) => {
                    if (!weekStart) {
                      return (
                        <div
                          key={weekIndex}
                          aria-hidden="true"
                          className="min-h-10 sm:min-h-12 flex-1 rounded border bg-muted/10 dark:bg-muted/5"
                        />
                      )
                    }

                    const pnl = getWeekPnl(weekStart)
                    const trades = getWeekTrades(weekStart)
                    const weekNumber = getWeek(weekStart, { locale: dateLocale })
                    const weekRange = `${format(weekStart, 'MMM d', { locale: dateLocale })} - ${format(addDays(weekStart, 6), 'MMM d, yyyy', { locale: dateLocale })}`
                    const ariaLabel = `${t('calendar.week')} ${weekNumber}, ${formatCurrency(pnl, { signed: true })}`

                    return (
                      <CalendarResponsiveOverlay
                        key={`${weekStart.toISOString()}-${weekIndex}`}
                        popoverClassName="w-[400px] p-0 z-50"
                        drawerTitle={weekRange}
                        drawerDescription={formatCurrencyCompact(pnl)}
                        trigger={({ onClick }) => (
                          <button
                            type="button"
                            aria-label={ariaLabel}
                            className={cn(
                              "flex w-full flex-col items-center justify-center rounded border p-0.5 sm:p-1 min-h-10 sm:min-h-12 flex-1 cursor-pointer",
                              "transition-all duration-200 hover:scale-[1.02] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                              pnl > 0
                                ? "bg-green-50/80 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/50"
                                : pnl < 0
                                  ? "bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400/90 border-red-100/80 dark:border-red-900/40"
                                  : "bg-muted/20 dark:bg-muted/10 text-muted-foreground border-border"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (shouldSuppressCalendarActivation()) return
                              onClick?.()
                            }}
                          >
                            <span className="hidden sm:block text-[10px] font-medium text-muted-foreground leading-none">
                              {weekNumber}
                            </span>
                            <span className="text-[9px] sm:text-xs font-bold leading-tight truncate max-w-full px-0.5">
                              <ResponsiveCurrency value={pnl} />
                            </span>
                          </button>
                        )}
                      >
                        <WeekDetailContent
                          weekStart={weekStart}
                          pnl={pnl}
                          trades={trades}
                          dateLocale={dateLocale}
                          t={t}
                        />
                      </CalendarResponsiveOverlay>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
