'use client'

import React from "react"
import { format, eachWeekOfInterval, getWeek, getMonth, getYear, addDays } from "date-fns"
import { fr, enUS } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { Trade } from "@/prisma/generated/prisma/browser"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"
import { useI18n, useCurrentLocale } from "@/locales/client"
import {
  calendarDateKeyFromZoned,
  zonedYearInterval,
} from "@/lib/calendar-timezone"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useUserStore } from "../../../../../store/user-store"
import { CalendarResponsiveOverlay } from "./calendar-responsive-overlay"
import {
  formatCompactCurrency,
  formatCount,
  formatCurrency,
  pnlTone,
  pnlToneClass,
  pnlToneFill,
  widgetType,
} from "../widgets"

/** Whole-dollar money for the dense grid. Sans + tabular-nums, sign on the number. */
function signedWholeCurrency(value: number, locale: string) {
  return formatCurrency(value, locale, {
    maximumFractionDigits: 0,
    signDisplay: "always",
  })
}

function ResponsiveCurrency({
  value,
  locale,
  className,
}: {
  value: number
  locale: string
  className?: string
}) {
  return (
    <>
      <span className={cn("sm:hidden", className)}>{formatCompactCurrency(value, locale)}</span>
      <span className={cn("hidden sm:inline", className)}>{signedWholeCurrency(value, locale)}</span>
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
  locale,
  t,
}: {
  weekStart: Date
  pnl: number
  trades: { [key: string]: { trades: Trade[], pnl: number } }
  dateLocale: typeof enUS
  locale: string
  t: ReturnType<typeof useI18n>
}) {
  return (
    <div className="sm:p-4">
      <div className="mb-4 hidden items-baseline justify-between gap-3 sm:flex">
        <h4 className={widgetType.title}>
          {format(weekStart, 'MMM d', { locale: dateLocale })} - {format(addDays(weekStart, 6), 'MMM d, yyyy', { locale: dateLocale })}
        </h4>
        <span className={cn(widgetType.value, "shrink-0", pnlToneClass(pnlTone(pnl)))}>
          {signedWholeCurrency(pnl, locale)}
        </span>
      </div>
      <div className="max-h-[400px] overflow-y-auto pr-2">
        {Object.entries(trades).length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(trades).map(([date, { trades: dayTrades, pnl: dayPnl }]) => (
              <AccordionItem key={date} value={date}>
                <AccordionTrigger className="px-2 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3 pr-4">
                    <div className="flex min-w-0 flex-col items-start gap-0.5">
                      <h5 className="truncate text-sm font-medium">
                        {format(new Date(date), 'EEEE, MMM d, yyyy', { locale: dateLocale })}
                      </h5>
                      <span className={widgetType.caption}>
                        {formatCount(dayTrades.length, locale)} {t('calendar.trades')}
                      </span>
                    </div>
                    <span className={cn(widgetType.value, "shrink-0", pnlToneClass(pnlTone(dayPnl)))}>
                      {signedWholeCurrency(dayPnl, locale)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Trade rows sit on a shared rule, never in a box each */}
                  <ul className="divide-y">
                    {dayTrades.map((trade, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{trade.instrument}</span>
                          <span className={cn(widgetType.mono, "text-muted-foreground")}>
                            {format(new Date(trade.entryDate), 'HH:mm', { locale: dateLocale })}
                          </span>
                        </div>
                        <span className={cn(widgetType.value, "shrink-0", pnlToneClass(pnlTone(trade.pnl)))}>
                          {signedWholeCurrency(trade.pnl, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className={cn(widgetType.label, "py-4 text-center")}>
            {t('calendar.noTrades')}
          </p>
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
  const weekStartsOnMonday = locale === 'fr'

  const { startZoned: yearStartDate, endZoned: yearEndDate } = zonedYearInterval(year, timezone)

  const weeksToDisplay = eachWeekOfInterval(
    { start: yearStartDate, end: yearEndDate },
    { weekStartsOn: weekStartsOnMonday ? 1 : 0 }
  );

  function getWeekPnl(weekStart: Date) {
    let total = 0
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d)
      const key = calendarDateKeyFromZoned(day)
      if (calendarData[key]) total += calendarData[key].pnl
    }
    return total
  }

  function getWeekTrades(weekStart: Date) {
    const tradesByDay: { [key: string]: { trades: Trade[], pnl: number } } = {}
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d)
      const key = calendarDateKeyFromZoned(day)
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
    <div className="flex h-full min-h-0 flex-col gap-1 p-1 sm:gap-2 sm:p-2">
      <div
        className="-mx-1 overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:overflow-visible sm:px-0"
        role="region"
        aria-label={String(year)}
      >
        <div className="flex min-w-[680px] flex-col gap-1 sm:min-w-0 sm:gap-2">
          {/* Month headers and totals */}
          <div className="grid grid-cols-12 gap-0.5 sm:gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const monthlyPnl = getMonthPnl(i)
              return (
                <div key={i} className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
                  <div className={cn(widgetType.label, "truncate text-center font-medium")}>
                    {format(new Date(year, i, 1), 'MMM', { locale: dateLocale })}
                  </div>
                  {/* The sign is on the number, so tone is never the only signal */}
                  <div
                    className={cn(
                      "truncate px-0.5 text-center text-[10px] font-semibold tabular-nums sm:px-1 sm:text-xs",
                      pnlToneClass(pnlTone(monthlyPnl)),
                    )}
                  >
                    <ResponsiveCurrency value={monthlyPnl} locale={locale} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weeks grid */}
          <div className="grid flex-1 grid-cols-12 gap-0.5 sm:gap-1">
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
                <div key={monthIndex} className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
                  {allWeeks.map((weekStart, weekIndex) => {
                    if (!weekStart) {
                      return (
                        <div
                          key={weekIndex}
                          aria-hidden="true"
                          className="min-h-10 flex-1 rounded ring-1 ring-border sm:min-h-12"
                        />
                      )
                    }

                    const pnl = getWeekPnl(weekStart)
                    const trades = getWeekTrades(weekStart)
                    const weekNumber = getWeek(weekStart, { locale: dateLocale })
                    const weekRange = `${format(weekStart, 'MMM d', { locale: dateLocale })} - ${format(addDays(weekStart, 6), 'MMM d, yyyy', { locale: dateLocale })}`
                    const tone = pnlTone(pnl)
                    const ariaLabel = `${t('calendar.week')} ${weekNumber}, ${signedWholeCurrency(pnl, locale)}`

                    return (
                      <CalendarResponsiveOverlay
                        key={`${weekStart.toISOString()}-${weekIndex}`}
                        popoverClassName="w-[400px] p-0 z-50"
                        drawerTitle={weekRange}
                        drawerDescription={signedWholeCurrency(pnl, locale)}
                        trigger={({ onClick }) => (
                          <button
                            type="button"
                            aria-label={ariaLabel}
                            className={cn(
                              "relative flex min-h-10 w-full flex-1 cursor-pointer flex-col items-center justify-center rounded p-0.5 sm:min-h-12 sm:p-1",
                              "ring-1 ring-border outline-none hover:z-10 hover:ring-foreground/40",
                              "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                              "motion-safe:transition-shadow motion-safe:duration-150 motion-safe:ease-out",
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              onClick?.()
                            }}
                          >
                            {/* P&L sign is the one thing on this cell that earns color. */}
                            {tone !== "neutral" ? (
                              <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 rounded opacity-[0.10]"
                                style={{ backgroundColor: pnlToneFill(tone) }}
                              />
                            ) : null}
                            <span className={cn(widgetType.label, "hidden leading-none tabular-nums sm:block")}>
                              {weekNumber}
                            </span>
                            <span
                              className={cn(
                                "max-w-full truncate px-0.5 text-[10px] font-semibold leading-tight tabular-nums sm:text-xs",
                                pnlToneClass(tone),
                              )}
                            >
                              <ResponsiveCurrency value={pnl} locale={locale} />
                            </span>
                          </button>
                        )}
                      >
                        <WeekDetailContent
                          weekStart={weekStart}
                          pnl={pnl}
                          trades={trades}
                          dateLocale={dateLocale}
                          locale={locale}
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
