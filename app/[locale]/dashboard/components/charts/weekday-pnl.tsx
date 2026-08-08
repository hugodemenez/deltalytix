"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { CategoricalChartState } from "recharts/types/chart/types";
import { useData } from "@/context/data-provider";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { translateWeekdayPnL } from "@/lib/translation-utils";
import { Button } from "@/components/ui/button";
import {
  axisProps,
  chartMargin,
  formatCompactCurrency,
  formatCount,
  formatCurrency,
  isCompactSize,
  pnlTone,
  pnlToneClass,
  pnlToneFill,
  WidgetBody,
  WidgetCard,
  WidgetChartGrid,
  WidgetChartInteractive,
  WidgetEmpty,
  WidgetHeader,
  WidgetTooltip,
  WidgetZeroLine,
} from "../widgets";
import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_WEEKDAY,
} from "./chart-loading-skeleton";

const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday = 0, Saturday = 6

interface WeekdayPNLChartProps {
  size?: WidgetSize;
}

interface WeekdayDatum {
  day: number;
  pnl: number;
  tradeCount: number;
}

interface WeekdayTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeekdayDatum }>;
  t: ReturnType<typeof useI18n>;
  locale: string;
}

function WeekdayTooltip({ active, payload, t, locale }: WeekdayTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <WidgetTooltip
      title={translateWeekdayPnL(t, data.day)}
      rows={[
        {
          label: t("weekdayPnl.tooltip.averagePnl"),
          value: formatCurrency(data.pnl, locale),
          toneClassName: pnlToneClass(pnlTone(data.pnl)),
        },
        {
          label: t("weekdayPnl.tooltip.trades"),
          value: formatCount(data.tradeCount, locale),
        },
      ]}
    />
  );
}

export default function WeekdayPNLChart({
  size = "medium",
}: WeekdayPNLChartProps) {
  const { calendarData, weekdayFilter, setWeekdayFilter, isLoading } =
    useData();
  const [activeDay, setActiveDay] = React.useState<number | null>(null);
  const t = useI18n();
  const locale = useCurrentLocale();

  const weekdayData = React.useMemo<WeekdayDatum[]>(() => {
    const weekdayTotals = daysOfWeek.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { total: 0, count: 0 },
      }),
      {} as Record<number, { total: number; count: number }>,
    );

    Object.entries(calendarData).forEach(([date, entry]) => {
      const dayOfWeek = new Date(date).getUTCDay();
      weekdayTotals[dayOfWeek].total += entry.pnl;
      weekdayTotals[dayOfWeek].count += 1;
    });

    return daysOfWeek.map((day) => ({
      day,
      pnl:
        weekdayTotals[day].count > 0
          ? weekdayTotals[day].total / weekdayTotals[day].count
          : 0,
      tradeCount: weekdayTotals[day].count,
    }));
  }, [calendarData]);

  const selectedDays = React.useMemo(
    () => weekdayFilter.days ?? [],
    [weekdayFilter.days],
  );
  const hasFilter = selectedDays.length > 0;
  const hasData = weekdayData.some((entry) => entry.tradeCount > 0);

  const handleActivate = React.useCallback(() => {
    if (activeDay === null) return;
    if (selectedDays.includes(activeDay)) {
      setWeekdayFilter({ days: selectedDays.filter((d) => d !== activeDay) });
    } else {
      setWeekdayFilter({ days: [...selectedDays, activeDay] });
    }
  }, [activeDay, selectedDays, setWeekdayFilter]);

  const handleMouseMove = React.useCallback((state: CategoricalChartState) => {
    const point = state?.activePayload?.[0]?.payload as
      | WeekdayDatum
      | undefined;
    setActiveDay(point ? point.day : null);
  }, []);

  const handleMouseLeave = React.useCallback(() => setActiveDay(null), []);

  const interactiveLabel =
    activeDay !== null
      ? `${t("filters.title")}: ${translateWeekdayPnL(t, activeDay)}`
      : `${t("filters.title")}: ${t("weekdayPnl.title")}`;

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("weekdayPnl.title")}
        description={t("weekdayPnl.description")}
        actions={
          hasFilter ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setWeekdayFilter({ days: [] })}
            >
              {t("weekdayPnl.clearFilter")}
            </Button>
          ) : null
        }
      />
      <WidgetBody
        size={size}
        flush
        className={cn(isCompactSize(size) ? "p-1" : "p-2")}
      >
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_WEEKDAY}
            xDataKey="day"
            yDataKey="pnl"
            yAxisWidth={45}
            xTickCount={7}
          />
        ) : !hasData ? (
          <WidgetEmpty size={size} message={t("chat.noTradesAvailable")} />
        ) : (
          <WidgetChartInteractive
            onActivate={handleActivate}
            label={interactiveLabel}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekdayData}
                margin={chartMargin(size)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <WidgetChartGrid />
                <XAxis
                  dataKey="day"
                  {...axisProps(size)}
                  height={isCompactSize(size) ? 20 : 24}
                  tickFormatter={(value) => {
                    const dayName = translateWeekdayPnL(t, value);
                    return isCompactSize(size) ? dayName.slice(0, 3) : dayName;
                  }}
                />
                <YAxis
                  {...axisProps(size)}
                  width={52}
                  tickFormatter={(value: number) =>
                    formatCompactCurrency(value, locale)
                  }
                />
                <WidgetZeroLine />
                <Tooltip
                  content={<WeekdayTooltip t={t} locale={locale} />}
                  cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Bar
                  dataKey="pnl"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={isCompactSize(size) ? 25 : 40}
                  isAnimationActive={false}
                >
                  {weekdayData.map((entry) => (
                    <Cell
                      key={`cell-${entry.day}`}
                      fill={pnlToneFill(pnlTone(entry.pnl))}
                      fillOpacity={
                        !hasFilter || selectedDays.includes(entry.day) ? 1 : 0.3
                      }
                      className="motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </WidgetChartInteractive>
        )}
      </WidgetBody>
    </WidgetCard>
  );
}
