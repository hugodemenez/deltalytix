'use client'

import React, { useState, useEffect, useMemo } from "react"
import { format, addMonths, subMonths, isSameMonth, getDay, getYear } from "date-fns"
import {
  calendarDateKeyFromZoned,
  getCalendarGridDays,
  isTodayInTimezone,
  toUserZonedTime,
  zonedMonthInterval,
} from "@/lib/calendar-timezone"
import { fr, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Newspaper, Calendar, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { CalendarModal } from "./daily-modal"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { translateWeekday, translateWeekdayShort } from "@/lib/translation-utils"
import { WeeklyModal } from "./weekly-modal"
import { HourlyFinancialTimeline } from "../mindset/hourly-financial-timeline"
import { CalendarResponsiveOverlay } from "./calendar-responsive-overlay"
import { ImportanceFilter } from "@/app/[locale]/dashboard/components/importance-filter"
import { CountryFilter } from "@/components/country-filter"
import { useNewsFilterStore } from "@/store/filters/news-filter-store"
import { useCalendarViewStore } from "@/store/widgets/calendar-view"
import WeeklyCalendarPnl from "./weekly-calendar"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import { useUserStore } from "@/store/user-store"
import { Account } from "@/context/data-provider"
import { HIDDEN_GROUP_NAME } from "../filters/account-group-board"
import {
  WidgetCard,
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  formatCompactCurrency,
  formatCount,
  formatCurrency,
  pnlTone,
  pnlToneClass,
  pnlToneFill,
  widgetType,
} from "../widgets"


const WEEKDAYS_SUNDAY_START = [
  'calendar.weekdays.sun',
  'calendar.weekdays.mon',
  'calendar.weekdays.tue',
  'calendar.weekdays.wed',
  'calendar.weekdays.thu',
  'calendar.weekdays.fri',
  'calendar.weekdays.sat'
] as const

const WEEKDAYS_MONDAY_START = [
  'calendar.weekdays.mon',
  'calendar.weekdays.tue',
  'calendar.weekdays.wed',
  'calendar.weekdays.thu',
  'calendar.weekdays.fri',
  'calendar.weekdays.sat',
  'calendar.weekdays.sun'
] as const

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

const truncateAccountNumber = (accountNumber: string, maxLength: number = 15): string => {
  if (accountNumber.length <= maxLength) {
    return accountNumber
  }

  // Always show last 3 digits
  const lastThree = accountNumber.slice(-3)
  const remainingLength = maxLength - 3 - 1 // -1 for the ellipsis

  if (remainingLength <= 0) {
    return `...${lastThree}`
  }

  // Show beginning + ellipsis + last 3 digits
  const beginning = accountNumber.slice(0, remainingLength)
  return `${beginning}...${lastThree}`
}

interface CalendarPnlProps {
  calendarData: CalendarData;
  financialEvents?: FinancialEvent[];
  hideFiltersOnMobile?: boolean;
}


type ImpactLevel = "low" | "medium" | "high"
const IMPACT_LEVELS: ImpactLevel[] = ["low", "medium", "high"]

const getEventImportanceStars = (importance: string): ImpactLevel => {
  switch (importance.toUpperCase()) {
    case 'HIGH':
      return "high"
    case 'MEDIUM':
      return "medium"
    case 'LOW':
      return "low"
    default:
      return "low"
  }
}

function EventBadge({ events, impactLevels }: { events: FinancialEvent[], impactLevels: ImpactLevel[] }) {
  const t = useI18n()
  const locale = useCurrentLocale()
  // Filter events by impact level
  const filteredEvents = events.filter(e => impactLevels.includes(getEventImportanceStars(e.importance)))
  if (filteredEvents.length === 0) return null

  return (
    <CalendarResponsiveOverlay
      popoverClassName="w-[400px] p-0 z-50"
      drawerTitle={t('calendar.events.title')}
      drawerDescription={String(filteredEvents.length)}
      trigger={({ onClick }) => (
        <button
          type="button"
          aria-label={`${t('calendar.events.title')}: ${formatCount(filteredEvents.length, locale)}`}
          className={cn(
            "flex h-4 items-center justify-center gap-0.5 rounded-sm border bg-background px-1",
            "text-[8px] font-medium tabular-nums text-foreground sm:text-[9px]",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
          )}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.()
          }}
        >
          <Newspaper className="h-2.5 w-2.5" aria-hidden />
          {formatCount(filteredEvents.length, locale)}
        </button>
      )}
    >
      <HourlyFinancialTimeline
        date={filteredEvents.length > 0 ? new Date(filteredEvents[0].date) : new Date()}
        events={filteredEvents}
        className="h-[400px] max-sm:h-[50vh]"
        preventScrollPropagation={true}
      />
    </CalendarResponsiveOverlay>
  )
}

function RenewalBadgeContent({ renewals }: { renewals: Account[] }) {
  const t = useI18n()
  const locale = useCurrentLocale()

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h3 className={widgetType.title}>{t('propFirm.renewal.title')}</h3>
        <p className={widgetType.caption}>
          {formatCount(renewals.length, locale)}{' '}
          {renewals.length === 1 ? t('propFirm.renewal.account') : t('propFirm.renewal.accounts')}
        </p>
      </div>

      {/* Account list: rows separated by a rule, never a card each */}
      <ul className="max-h-[60vh] divide-y overflow-y-auto">
        {renewals.map((account) => (
          <li key={account.id} className="flex items-start justify-between gap-3 py-2.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground" title={account.number}>
                {account.propfirm
                  ? account.propfirm
                  : truncateAccountNumber(account.number, 18)}
              </span>
              <span className={widgetType.caption}>
                {account.propfirm ? `${truncateAccountNumber(account.number, 12)} · ` : ''}
                {account.paymentFrequency?.toLowerCase()} {t('propFirm.renewal.frequency')}
                {account.autoRenewal ? ` · ${t('propFirm.renewal.notification')}` : ''}
              </span>
            </div>
            <span className={cn(widgetType.value, "shrink-0 text-right")}>
              {account.price != null ? formatCurrency(account.price, locale) : null}
            </span>
          </li>
        ))}
      </ul>

      {renewals.length > 0 && (
        <div className={cn(widgetType.caption, "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t pt-3")}>
          <span>{t('propFirm.renewal.totalAccounts')}: {formatCount(renewals.length, locale)}</span>
          <span className="truncate">
            {t('propFirm.renewal.nextRenewal')}: {renewals[0]?.nextPaymentDate ? format(new Date(renewals[0].nextPaymentDate), 'MMM dd, yyyy') : 'N/A'}
          </span>
        </div>
      )}
    </div>
  )
}

function RenewalBadge({ renewals }: { renewals: Account[] }) {
  const t = useI18n()
  const locale = useCurrentLocale()

  if (renewals.length === 0) return null

  return (
    <CalendarResponsiveOverlay
      popoverClassName="w-[320px] sm:w-[380px] md:w-[420px] max-w-[90vw] p-0 z-50 border shadow-lg bg-card"
      popoverSideOffset={8}
      drawerTitle={t('propFirm.renewal.title')}
      trigger={({ onClick }) => (
        <button
          type="button"
          aria-label={`${t('propFirm.renewal.title')}: ${formatCount(renewals.length, locale)}`}
          className={cn(
            "flex h-4 items-center justify-center gap-0.5 rounded-sm border bg-background px-1",
            "text-[8px] font-medium tabular-nums text-foreground sm:text-[9px]",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
          )}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.()
          }}
        >
          <Calendar className="h-2.5 w-2.5" aria-hidden />
          {formatCount(renewals.length, locale)}
        </button>
      )}
    >
      <RenewalBadgeContent renewals={renewals} />
    </CalendarResponsiveOverlay>
  )
}

export default function ResponsiveCalendarPnl({ calendarData, hideFiltersOnMobile = false }: CalendarPnlProps) {
  const accounts = useUserStore(state => state.accounts)
  const groups = useUserStore(state => state.groups)
  const t = useI18n()
  const locale = useCurrentLocale()
  const timezone = useUserStore(state => state.timezone)
  const userFinancialEvents = useFinancialEventsStore(state => state.events)
  const dateLocale = locale === 'fr' ? fr : enUS
  const weekStartsOnMonday = locale === 'fr'
  const WEEKDAYS = weekStartsOnMonday ? WEEKDAYS_MONDAY_START : WEEKDAYS_SUNDAY_START
  const [currentDate, setCurrentDate] = useState(() => toUserZonedTime(new Date(), timezone))
  const [isLoading, setIsLoading] = useState(false)
  const [monthEvents, setMonthEvents] = useState<FinancialEvent[]>([])

  useEffect(() => {
    setCurrentDate(toUserZonedTime(new Date(), timezone))
  }, [timezone])

  const calendarDays = useMemo(
    () => getCalendarGridDays(currentDate, weekStartsOnMonday),
    [currentDate, weekStartsOnMonday],
  )

  // Use the calendar view store
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    selectedWeekDate,
    setSelectedWeekDate,
    showMaxProfitAndDrawdown,
    setShowMaxProfitAndDrawdown
  } = useCalendarViewStore()

  // Use the global news filter store
  const impactLevels = useNewsFilterStore((s) => s.impactLevels)
  const setImpactLevels = useNewsFilterStore((s) => s.setImpactLevels)
  const selectedCountries = useNewsFilterStore((s) => s.selectedCountries)
  const setSelectedCountries = useNewsFilterStore((s) => s.setSelectedCountries)

  // Update monthEvents when currentDate or financialEvents change
  useEffect(() => {
    const { startUtc, endUtc } = zonedMonthInterval(currentDate, timezone)

    const filteredEvents = userFinancialEvents.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate >= startUtc && eventDate <= endUtc && event.lang === locale
    })

    setMonthEvents(filteredEvents)
  }, [currentDate, userFinancialEvents, locale, timezone])

  const handlePrevMonth = React.useCallback(() => {
    setCurrentDate(subMonths(currentDate, 1))
  }, [currentDate])

  const handleNextMonth = React.useCallback(() => {
    setCurrentDate(addMonths(currentDate, 1))
  }, [currentDate])

  // Memoize countries array
  const countries = useMemo(() => {
    return Array.from(new Set(monthEvents
      .map(event => event.country)
      .filter((country): country is string => country !== null && country !== undefined)
    )).sort((a, b) => {
      if (a === "United States") return -1;
      if (b === "United States") return 1;
      return a.localeCompare(b);
    });
  }, [monthEvents]);

  // Pre-compute events map by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, FinancialEvent[]>();
    monthEvents.forEach(event => {
      if (!event.date) return;
      try {
        const dateKey = calendarDateKeyFromZoned(toUserZonedTime(new Date(event.date), timezone));
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(event);
      } catch (error) {
        console.error('Error parsing event date:', error);
      }
    });
    return map;
  }, [monthEvents, timezone]);

  // Pre-compute renewals map by date
  const renewalsByDate = useMemo(() => {
    const hiddenGroup = groups.find(g => g.name === HIDDEN_GROUP_NAME);
    const hiddenAccountIds = hiddenGroup ? new Set(hiddenGroup.accounts.map(a => a.id)) : new Set();

    const map = new Map<string, Account[]>();
    accounts.forEach(account => {
      if (hiddenAccountIds.has(account.id) || !account.nextPaymentDate) return;
      try {
        const dateKey = calendarDateKeyFromZoned(
          toUserZonedTime(new Date(account.nextPaymentDate), timezone),
        );
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(account);
      } catch (error) {
        console.error('Error parsing renewal date:', error);
      }
    });
    return map;
  }, [accounts, timezone, groups]);

  // Pre-compute day calculations (maxProfit, maxDrawdown) for all days
  const dayCalculations = useMemo(() => {
    const calculations = new Map<string, { maxProfit: number; maxDrawdown: number }>();

    Object.entries(calendarData).forEach(([dateString, dayData]) => {
      if (!dayData.trades || dayData.trades.length === 0) {
        calculations.set(dateString, { maxProfit: 0, maxDrawdown: 0 });
        return;
      }

      // Create a copy to avoid mutating original
      const sortedTrades = [...dayData.trades].sort((a, b) =>
        new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
      );

      const equity = [0];
      let cumulative = 0;
      sortedTrades.forEach(trade => {
        cumulative += trade.pnl - (trade.commission || 0);
        equity.push(cumulative);
      });

      // Max drawdown
      let peak = -Infinity;
      let maxDD = 0;
      equity.forEach(val => {
        if (val > peak) peak = val;
        const dd = peak - val;
        if (dd > maxDD) maxDD = dd;
      });

      // Max profit (runup)
      let trough = Infinity;
      let maxRU = 0;
      equity.forEach(val => {
        if (val < trough) trough = val;
        const ru = val - trough;
        if (ru > maxRU) maxRU = ru;
      });

      calculations.set(dateString, { maxProfit: maxRU, maxDrawdown: maxDD });
    });

    return calculations;
  }, [calendarData]);

  // Filter events by impact level and country - memoized
  const filteredEventsByDate = useMemo(() => {
    const filtered = new Map<string, FinancialEvent[]>();
    eventsByDate.forEach((events, dateKey) => {
      const filteredEvents = events.filter(e => {
        const matchesImpact = impactLevels.length === 0 ||
          impactLevels.includes(getEventImportanceStars(e.importance));
        const matchesCountry = selectedCountries.length === 0 ||
          (e.country && selectedCountries.includes(e.country));
        return matchesImpact && matchesCountry;
      });
      if (filteredEvents.length > 0) {
        filtered.set(dateKey, filteredEvents);
      }
    });
    return filtered;
  }, [eventsByDate, impactLevels, selectedCountries]);

  // Memoize monthly and yearly totals
  const monthlyTotal = useMemo(() => {
    const currentMonthKey = format(currentDate, 'yyyy-MM')
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      if (dateString.startsWith(currentMonthKey)) {
        return total + dayData.pnl
      }
      return total
    }, 0)
  }, [calendarData, currentDate])

  const yearTotal = useMemo(() => {
    const currentYear = format(currentDate, 'yyyy')
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      if (dateString.startsWith(currentYear)) {
        return total + dayData.pnl
      }
      return total
    }, 0)
  }, [calendarData, currentDate])

  const calculateWeeklyTotal = React.useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
    const startOfWeekIndex = index - 6
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)
    return weekDays.reduce((total, day) => {
      const dayData = calendarData[calendarDateKeyFromZoned(day)]
      return total + (dayData ? dayData.pnl : 0)
    }, 0)
  }, [])

  const periodTotal = viewMode === 'daily' ? monthlyTotal : yearTotal
  const periodTone = pnlTone(periodTotal)

  return (
    <WidgetCard>
      <WidgetHeader
        size="large"
        className="flex-col items-stretch gap-2 sm:flex-row sm:items-center"
        title={
          <span className="capitalize">
            {viewMode === 'daily'
              ? format(currentDate, 'MMMM yyyy', { locale: dateLocale })
              : format(currentDate, 'yyyy', { locale: dateLocale })}
          </span>
        }
        actions={
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {/* Impact Level Filter */}
            <div className={cn("flex items-center gap-2", hideFiltersOnMobile && "max-sm:hidden")}>
              <span className={cn(widgetType.label, "whitespace-nowrap")}>
                {t('calendar.importanceFilter.title')}
              </span>
              <ImportanceFilter
                value={impactLevels}
                onValueChange={setImpactLevels}
                className="h-8"
              />
            </div>
            <CountryFilter
              countries={countries}
              value={selectedCountries}
              onValueChange={setSelectedCountries}
              className={cn("h-8", hideFiltersOnMobile && "max-sm:hidden")}
            />
            {/* View mode toggle */}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant={viewMode === 'daily' ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={viewMode === 'daily'}
                aria-label={t('calendar.viewMode.daily')}
                className="h-7 px-2"
                onClick={() => setViewMode('daily')}
              >
                <Calendar className="h-4 w-4 sm:mr-1" aria-hidden />
                <span className="hidden text-xs sm:inline">{t('calendar.viewMode.daily')}</span>
              </Button>
              <Button
                type="button"
                variant={viewMode === 'weekly' ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={viewMode === 'weekly'}
                aria-label={t('calendar.viewMode.weekly')}
                className="h-7 px-2"
                onClick={() => setViewMode('weekly')}
              >
                <CalendarDays className="h-4 w-4 sm:mr-1" aria-hidden />
                <span className="hidden text-xs sm:inline">{t('calendar.viewMode.weekly')}</span>
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => viewMode === 'daily' ? handlePrevMonth() : setCurrentDate(new Date(getYear(currentDate) - 1, 0, 1))}
                className="h-7 w-7 sm:h-8 sm:w-8"
                aria-label={viewMode === 'daily' ? "Previous month" : "Previous year"}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => viewMode === 'daily' ? handleNextMonth() : setCurrentDate(new Date(getYear(currentDate) + 1, 0, 1))}
                className="h-7 w-7 sm:h-8 sm:w-8"
                aria-label={viewMode === 'daily' ? "Next month" : "Next year"}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        }
      >
        <span className={cn(widgetType.value, "shrink-0", pnlToneClass(periodTone))}>
          <ResponsiveCurrency value={periodTotal} locale={locale} />
        </span>
      </WidgetHeader>
      <WidgetBody size="large" className="p-1 sm:p-4">
        {viewMode === 'daily' ? (
          <div
            role="grid"
            aria-label={format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
            className="h-full"
          >
            <div role="row" className="mb-0.5 grid grid-cols-7 gap-x-px sm:mb-1 sm:grid-cols-8">
              {WEEKDAYS.map((day) => (
                <div key={day} role="columnheader" className={cn(widgetType.label, "truncate px-px text-center font-medium")}>
                  <span className="sm:hidden">{translateWeekdayShort(day, locale)}</span>
                  <span className="hidden sm:inline">{translateWeekday(t, day)}</span>
                </div>
              ))}
              <div role="columnheader" className={cn(widgetType.label, "hidden text-center font-medium sm:block")}>
                {t('calendar.weekdays.weekly')}
              </div>
            </div>
            <div className="grid h-[calc(100%-16px)] auto-rows-fr grid-cols-7 rounded-lg sm:h-[calc(100%-20px)] sm:grid-cols-8">
              {calendarDays.map((date, index) => {
                const dateString = calendarDateKeyFromZoned(date)
                const dayData = calendarData[dateString]
                // Check if it's the last day of the week (Saturday for Sunday start, Sunday for Monday start)
                const isLastDayOfWeek = weekStartsOnMonday ? getDay(date) === 0 : getDay(date) === 6
                const isCurrentMonth = isSameMonth(date, currentDate)
                const isToday = isTodayInTimezone(date, timezone)
                const dateEvents = filteredEventsByDate.get(dateString) || []
                const dateRenewals = renewalsByDate.get(dateString) || []
                const calculations = dayCalculations.get(dateString) || { maxProfit: 0, maxDrawdown: 0 }
                const maxProfit = calculations.maxProfit
                const maxDrawdown = calculations.maxDrawdown
                const dayTone = dayData ? pnlTone(dayData.pnl) : "neutral"
                const dayLabel = format(date, 'EEEE, MMMM d, yyyy', { locale: dateLocale })
                const accessibleName = dayData
                  ? `${dayLabel}, ${signedWholeCurrency(dayData.pnl, locale)}, ${formatCount(dayData.tradeNumber, locale)} ${dayData.tradeNumber > 1 ? t('calendar.trades') : t('calendar.trade')}`
                  : `${dayLabel}, ${t('calendar.noTrades')}`

                return (
                  <React.Fragment key={dateString}>
                    <div
                      role="gridcell"
                      className={cn(
                        "relative h-full min-h-[44px] w-full sm:min-h-0",
                        "rounded-none ring-1 ring-border",
                        isToday && "z-10 ring-foreground",
                        index === 0 && "rounded-tl-lg",
                        index === 35 && "rounded-bl-lg",
                      )}
                    >
                      {/* P&L sign is the one thing on this cell that earns color. */}
                      {dayData && dayTone !== "neutral" ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-[0.10]"
                          style={{ backgroundColor: pnlToneFill(dayTone) }}
                        />
                      ) : null}
                      <button
                        type="button"
                        aria-label={accessibleName}
                        aria-current={isToday ? "date" : undefined}
                        className={cn(
                          "absolute inset-0 flex cursor-pointer flex-col p-0.5 text-left sm:p-1",
                          "rounded-none outline-none hover:z-10 hover:ring-1 hover:ring-foreground/40",
                          "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          "motion-safe:transition-shadow motion-safe:duration-150 motion-safe:ease-out",
                          !isCurrentMonth && "opacity-50",
                        )}
                        onClick={() => setSelectedDate(date)}
                      >
                        <span
                          className={cn(
                            "min-w-[12px] text-center text-[10px] font-medium leading-none sm:min-w-[14px] sm:text-[11px]",
                            isToday ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {format(date, 'd')}
                        </span>
                        <span className="flex min-h-0 flex-1 flex-col justify-end gap-px sm:gap-0.5">
                          {dayData ? (
                            <span className={cn(
                              "truncate text-center text-[10px] font-semibold leading-tight tabular-nums sm:text-[11px]",
                              pnlToneClass(dayTone),
                            )}>
                              <ResponsiveCurrency value={dayData.pnl} locale={locale} />
                            </span>
                          ) : (
                            <span aria-hidden className="invisible text-center text-[10px] font-semibold sm:text-[11px]">$0</span>
                          )}
                          {/* An empty day stays empty: the cell's own blankness says
                              there were no trades, so labelling it adds noise. */}
                          {dayData && (
                            <span className={cn(widgetType.caption, "truncate text-center text-[10px] leading-tight sm:text-[9px]")}>
                              <span className="sm:hidden">{formatCount(dayData.tradeNumber, locale)}</span>
                              <span className="hidden sm:inline">
                                {`${formatCount(dayData.tradeNumber, locale)} ${dayData.tradeNumber > 1 ? t('calendar.trades') : t('calendar.trade')}`}
                              </span>
                            </span>
                          )}
                          {dayData && showMaxProfitAndDrawdown && (
                            <>
                              <span className={cn(widgetType.caption, "hidden truncate text-center text-[9px] tabular-nums sm:block")}>
                                {t('calendar.maxProfit')}: {formatCurrency(maxProfit, locale, { maximumFractionDigits: 0 })}
                              </span>
                              <span className={cn(widgetType.caption, "hidden truncate text-center text-[9px] tabular-nums sm:block")}>
                                {t('calendar.maxDD')}: {formatCurrency(-maxDrawdown, locale, { maximumFractionDigits: 0 })}
                              </span>
                            </>
                          )}
                        </span>
                      </button>
                      {/* Event and renewal affordances sit above the day button, never inside it */}
                      {(dateEvents.length > 0 || dateRenewals.length > 0) && (
                        <div className="pointer-events-none absolute right-0.5 top-0.5 z-20 flex flex-col items-end gap-px">
                          <div className="pointer-events-auto flex flex-col items-end gap-px">
                            {dateEvents.length > 0 && <EventBadge events={dateEvents} impactLevels={impactLevels} />}
                            {dateRenewals.length > 0 && <RenewalBadge renewals={dateRenewals} />}
                          </div>
                        </div>
                      )}
                    </div>
                    {isLastDayOfWeek && (() => {
                      const weeklyTotal = calculateWeeklyTotal(index, calendarDays, calendarData)
                      const weeklyTone = pnlTone(weeklyTotal)
                      return (
                        <button
                          type="button"
                          aria-label={`${t('calendar.weekdays.weekly')}, ${format(date, 'MMMM d, yyyy', { locale: dateLocale })}, ${signedWholeCurrency(weeklyTotal, locale)}`}
                          className={cn(
                            "hidden h-full w-full cursor-pointer items-center justify-center rounded-none sm:flex",
                            "ring-1 ring-border outline-none hover:z-10 hover:ring-foreground/40",
                            "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            "motion-safe:transition-shadow motion-safe:duration-150 motion-safe:ease-out",
                            index === 6 && "rounded-tr-lg",
                            index === 41 && "rounded-br-lg"
                          )}
                          onClick={() => setSelectedWeekDate(date)}
                        >
                          <span className={cn(
                            "truncate px-0.5 text-[11px] font-semibold tabular-nums",
                            pnlToneClass(weeklyTone),
                          )}>
                            {signedWholeCurrency(weeklyTotal, locale)}
                          </span>
                        </button>
                      )
                    })()}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        ) : (
          <WeeklyCalendarPnl
            calendarData={calendarData}
            year={getYear(currentDate)}
          />
        )}
      </WidgetBody>
      <CalendarModal
        isOpen={selectedDate !== null && selectedDate !== undefined}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null)
        }}
        selectedDate={selectedDate}
        dayData={selectedDate ? calendarData[calendarDateKeyFromZoned(selectedDate)] : undefined}
        isLoading={isLoading}
      />
      <WeeklyModal
        isOpen={selectedWeekDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedWeekDate(null)
        }}
        selectedDate={selectedWeekDate}
        calendarData={calendarData}
        isLoading={isLoading}
      />
      <WidgetFooter size="large" className="hidden sm:flex">
        <label htmlFor="calendar-show-max" className={widgetType.label}>
          {t('calendar.viewOptions.showMaxProfitAndDD')}
        </label>
        <Switch
          id="calendar-show-max"
          checked={showMaxProfitAndDrawdown}
          onCheckedChange={setShowMaxProfitAndDrawdown}
        />
      </WidgetFooter>
    </WidgetCard>
  )
}
