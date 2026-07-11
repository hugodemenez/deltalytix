"use client";

import { useMemo } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCurrentLocale, useI18n } from "@/locales/landing-client";
import { translateWeekday } from "@/lib/translation-utils";
import { sumLandingCalendarMonthPnl } from "@/lib/landing-calendar-monthly-total";

type CalendarDayEntry = {
  pnl: number;
  tradeNumber: number;
};

type PreviewCalendarData = Record<string, CalendarDayEntry>;

const WEEKDAYS = [
  "calendar.weekdays.sun",
  "calendar.weekdays.mon",
  "calendar.weekdays.tue",
  "calendar.weekdays.wed",
  "calendar.weekdays.thu",
  "calendar.weekdays.fri",
  "calendar.weekdays.sat",
] as const;

function formatCurrency(value: number, locale: string) {
  return value.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getCalendarDays(monthStart: Date, monthEnd: Date) {
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  if (days.length === 42) return days;

  const lastDay = days[days.length - 1];
  const additionalDays = eachDayOfInterval({
    start: addDays(lastDay, 1),
    end: addDays(startDate, 41),
  });

  return [...days, ...additionalDays].slice(0, 42);
}

function buildDemoCalendarData(): PreviewCalendarData {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const entries = [
    { day: 1, pnl: 120, trades: 1 },
    { day: 2, pnl: 620, trades: 4 },
    { day: 3, pnl: 80, trades: 2 },
    { day: 4, pnl: -240, trades: 3 },
    { day: 6, pnl: 380, trades: 2 },
    { day: 7, pnl: -60, trades: 1 },
    { day: 9, pnl: 980, trades: 5 },
    { day: 11, pnl: 210, trades: 2 },
    { day: 12, pnl: -120, trades: 2 },
    { day: 14, pnl: 320, trades: 1 },
    { day: 15, pnl: 540, trades: 3 },
    { day: 18, pnl: -320, trades: 4 },
    { day: 19, pnl: 90, trades: 1 },
    { day: 21, pnl: 760, trades: 3 },
    { day: 22, pnl: -45, trades: 1 },
    { day: 24, pnl: 150, trades: 2 },
    { day: 25, pnl: 70, trades: 1 },
    { day: 27, pnl: 420, trades: 3 },
    { day: 29, pnl: -95, trades: 1 },
  ];

  return entries.reduce<PreviewCalendarData>((acc, { day, pnl, trades }) => {
    const dateKey = format(new Date(year, month, day), "yyyy-MM-dd");
    acc[dateKey] = { pnl, tradeNumber: trades };
    return acc;
  }, {});
}

function LandingCalendarPreview({
  calendarData,
}: {
  calendarData: PreviewCalendarData;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const currentDate = useMemo(() => new Date(), []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = useMemo(
    () => getCalendarDays(monthStart, monthEnd),
    [monthStart, monthEnd],
  );

  const monthlyTotal = useMemo(
    () => sumLandingCalendarMonthPnl(calendarData, currentDate),
    [calendarData, currentDate],
  );

  const calculateWeeklyTotal = (index: number) => {
    const startOfWeekIndex = index - 6;
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1);
    return weekDays.reduce((total, day) => {
      const dayData = calendarData[format(day, "yyyy-MM-dd")];
      return total + (dayData?.pnl ?? 0);
    }, 0);
  };

  return (
    <Card className="flex h-full flex-col border-0 bg-white shadow-none dark:bg-[#26251e]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base sm:text-lg font-semibold truncate capitalize">
            {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
          </CardTitle>
          <div
            className={cn(
              "text-sm sm:text-base font-semibold truncate",
              monthlyTotal >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {formatCurrency(monthlyTotal, locale)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-1.5 sm:p-4">
        <div className="grid grid-cols-8 gap-x-px mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground"
            >
              {translateWeekday(t, day)}
            </div>
          ))}
          <div className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
            {t("calendar.weekdays.weekly")}
          </div>
        </div>
        <div className="grid grid-cols-8 auto-rows-fr rounded-lg h-[calc(100%-20px)]">
          {calendarDays.map((date, index) => {
            const dateString = format(date, "yyyy-MM-dd");
            const dayData = calendarData[dateString];
            const isLastDayOfWeek = getDay(date) === 6;
            const isCurrentMonth = isSameMonth(date, currentDate);

            return (
              <div key={dateString} className="contents">
                <div
                  className={cn(
                    "h-full flex flex-col rounded-none p-1 ring-1 ring-border",
                    dayData && dayData.pnl >= 0
                      ? "bg-green-50 dark:bg-green-900/20"
                      : dayData && dayData.pnl < 0
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-white dark:bg-[#26251e]",
                    isToday(date) && "ring-blue-500 bg-blue-500/5 z-10",
                    index === 0 && "rounded-tl-lg",
                    index === 35 && "rounded-bl-lg",
                  )}
                >
                  <div className="flex justify-between items-start gap-0.5">
                    <span
                      className={cn(
                        "text-[9px] sm:text-[11px] font-medium min-w-[14px] text-center",
                        isToday(date) && "text-primary font-semibold",
                        !isCurrentMonth && "opacity-50",
                      )}
                    >
                      {format(date, "d")}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-end gap-0.5">
                    {dayData ? (
                      <div
                        className={cn(
                          "text-[9px] sm:text-[11px] font-semibold truncate text-center",
                          dayData.pnl >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                          !isCurrentMonth && "opacity-50",
                        )}
                      >
                        {formatCurrency(dayData.pnl, locale)}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "text-[9px] sm:text-[11px] font-semibold invisible text-center",
                          !isCurrentMonth && "opacity-50",
                        )}
                      >
                        $0
                      </div>
                    )}
                    <div
                      className={cn(
                        "text-[7px] sm:text-[9px] text-muted-foreground truncate text-center",
                        !isCurrentMonth && "opacity-50",
                      )}
                    >
                      {dayData
                        ? `${dayData.tradeNumber} ${dayData.tradeNumber > 1 ? t("calendar.trades") : t("calendar.trade")}`
                        : t("calendar.noTrades")}
                    </div>
                  </div>
                </div>
                {isLastDayOfWeek &&
                  (() => {
                    const weeklyTotal = calculateWeeklyTotal(index);
                    return (
                      <div
                        className={cn(
                          "flex h-full items-center justify-center rounded-none bg-white ring-1 ring-border dark:bg-[#26251e]",
                          index === 6 && "rounded-tr-lg",
                          index === 41 && "rounded-br-lg",
                        )}
                      >
                        <div
                          className={cn(
                            "text-[9px] sm:text-[11px] font-semibold truncate px-0.5",
                            weeklyTotal >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                        >
                          {formatCurrency(weeklyTotal, locale)}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function CalendarFeaturePreview() {
  const calendarData = useMemo(() => buildDemoCalendarData(), []);

  return (
    <div className="h-full w-full overflow-hidden pointer-events-none">
      <LandingCalendarPreview calendarData={calendarData} />
    </div>
  );
}
