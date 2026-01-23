'use client'

import React from "react"
import { format, eachWeekOfInterval, getWeek, getMonth, getYear, addDays, startOfYear, endOfYear } from "date-fns"
import { fr, enUS } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { Trade } from "@/prisma/generated/prisma/browser"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useUserStore } from "../../../../../store/user-store"

const formatCurrency = (value: number) => {
  const formatted = value.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return formatted
}

interface WeeklyCalendarPnlProps {
  calendarData: CalendarData;
  year: number;
}

export default function WeeklyCalendarPnl({ calendarData, year }: WeeklyCalendarPnlProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS

  const yearStartDate = startOfYear(new Date(year, 0, 1));
  const yearEndDate = endOfYear(new Date(year, 0, 1));

  // This is the definitive list of week-start-sundays for the 'year' grid.
  const weeksToDisplay = eachWeekOfInterval(
    { start: yearStartDate, end: yearEndDate },
    { weekStartsOn: 0 } // Weeks start on Sunday
  );

  function getWeekPnl(weekStart: Date) {
    let total = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const key = format(day, 'yyyy-MM-dd', { locale: dateLocale })
      if (calendarData[key]) total += calendarData[key].pnl
    }
    return total
  }

  function getWeekTrades(weekStart: Date) {
    const tradesByDay: { [key: string]: { trades: Trade[], pnl: number } } = {}
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const key = format(day, 'yyyy-MM-dd', { locale: dateLocale })
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
    // Filter weeksToDisplay based on the new month assignment logic
    const currentMonthWeeks = weeksToDisplay.filter(weekStart => {
      const weekYear = getYear(weekStart);
      if (weekYear === year) {
        return getMonth(weekStart) === monthIndex;
      } else { // weekStart is in year-1
        return monthIndex === 0; // Assign to January of current 'year'
      }
    });
    currentMonthWeeks.forEach(weekStart => {
      total += getWeekPnl(weekStart)
    })
    return total
  }

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      {/* Month Headers and Totals */}
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 12 }, (_, i) => {
          const monthlyPnl = getMonthPnl(i)
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="text-center text-xs font-medium text-muted-foreground">
                {format(new Date(year, i, 1), 'MMM', { locale: dateLocale })}
              </div>
              <div className={cn(
                "text-center text-xs font-semibold px-1 py-0.5 rounded transition-colors",
                monthlyPnl > 0 
                  ? "text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/30" 
                  : monthlyPnl < 0 
                    ? "text-red-600 dark:text-red-400/90 bg-red-50/50 dark:bg-red-950/30" 
                    : "text-muted-foreground bg-muted/20"
              )}>
                {formatCurrency(monthlyPnl)}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Weeks Grid */}
      <div className="grid grid-cols-12 gap-1 flex-1">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          // Correctly filter weeks for the current month
          const monthWeeks = weeksToDisplay.filter(weekStart => {
            const weekYear = getYear(weekStart);
            if (weekYear === year) {
              return getMonth(weekStart) === monthIndex;
            } else { // weekStart is in year-1 (e.g. SunDec31_23 for year=2024 view)
              return monthIndex === 0; // Assign to January of current 'year'
            }
          });
          
          // Find the maximum number of weeks in any month based on the new assignment
          const maxWeeks = Math.max(...Array.from({ length: 12 }, (_, i) => 
            weeksToDisplay.filter(ws => {
              const wy = getYear(ws);
              if (wy === year) return getMonth(ws) === i;
              return i === 0;
            }).length
          ));
          
          // Add placeholder weeks if needed
          const allWeeks: (Date | null)[] = [...monthWeeks]
          while (allWeeks.length < maxWeeks) {
            allWeeks.push(null)
          }

          return (
            <div key={monthIndex} className="flex flex-col gap-1">
              {allWeeks.map((weekStart, weekIndex) => {
                if (!weekStart) {
                  return (
                    <div
                      key={weekIndex}
                      className="flex flex-col items-center justify-center border rounded p-1 min-h-12 flex-1 bg-muted/10 dark:bg-muted/5"
                    />
                  )
                }
                
                const pnl = getWeekPnl(weekStart)
                const trades = getWeekTrades(weekStart)
                return (
                  <Popover key={`${weekStart.toISOString()}-${weekIndex}`}>
                    <PopoverTrigger asChild>
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center border rounded p-1 min-h-12 flex-1 cursor-pointer",
                          "transition-all duration-200 hover:scale-[1.02] hover:shadow-xs",
                          pnl > 0 
                            ? "bg-green-50/80 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/50" 
                            : pnl < 0 
                              ? "bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400/90 border-red-100/80 dark:border-red-900/40" 
                              : "bg-muted/20 dark:bg-muted/10 text-muted-foreground border-border"
                        )}
                      >
                        <div className="text-[10px] font-medium opacity-80">{t('calendar.week')} {getWeek(weekStart, { locale: dateLocale })}</div>
                        <div className="text-xs font-bold">{formatCurrency(pnl)}</div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[400px] p-0 z-50" 
                      align="start"
                      side="right"
                      sideOffset={5}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-sm">
                            {format(weekStart, 'MMM d', { locale: dateLocale })} - {format(addDays(weekStart, 6), 'MMM d, yyyy', { locale: dateLocale })}
                          </h4>
                          <div className={cn(
                            "text-sm font-semibold",
                            pnl > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {formatCurrency(pnl)}
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
                                        {formatCurrency(dayPnl)}
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
                                            {formatCurrency(trade.pnl)}
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
                    </PopoverContent>
                  </Popover>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
} 