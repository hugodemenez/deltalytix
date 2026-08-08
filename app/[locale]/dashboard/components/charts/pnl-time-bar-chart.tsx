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
import { Trade } from "@/prisma/generated/prisma/browser";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { useUserStore } from "../../../../../store/user-store";
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
  LOADING_MOCK_HOURLY,
} from "./chart-loading-skeleton";

interface TimeOfDayTradeChartProps {
  size?: WidgetSize;
}

interface HourDatum {
  hour: number;
  avgPnl: number;
  tradeCount: number;
}

function hourRangeLabel(hour: number) {
  return `${hour}:00 - ${(hour + 1) % 24}:00`;
}

interface HourTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HourDatum }>;
  t: ReturnType<typeof useI18n>;
  locale: string;
}

function HourTooltip({ active, payload, t, locale }: HourTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <WidgetTooltip
      title={hourRangeLabel(data.hour)}
      rows={[
        {
          label: t("pnlTime.tooltip.averagePnl"),
          value: formatCurrency(data.avgPnl, locale),
          toneClassName: pnlToneClass(pnlTone(data.avgPnl)),
        },
        {
          label: t("pnlTime.tooltip.trades"),
          value: formatCount(data.tradeCount, locale),
        },
      ]}
    />
  );
}

export default function TimeOfDayTradeChart({
  size = "medium",
}: TimeOfDayTradeChartProps) {
  const {
    formattedTrades: trades,
    hourFilter,
    setHourFilter,
    isLoading,
  } = useData();
  const timezone = useUserStore((state) => state.timezone);
  const [activeHour, setActiveHour] = React.useState<number | null>(null);
  const t = useI18n();
  const locale = useCurrentLocale();

  const handleActivate = React.useCallback(() => {
    if (activeHour === null) return;
    if (hourFilter.hour === activeHour) {
      setHourFilter({ hour: null });
    } else {
      setHourFilter({ hour: activeHour });
    }
  }, [activeHour, hourFilter.hour, setHourFilter]);

  const handleMouseMove = React.useCallback((state: CategoricalChartState) => {
    const point = state?.activePayload?.[0]?.payload as HourDatum | undefined;
    setActiveHour(point ? point.hour : null);
  }, []);

  const handleMouseLeave = React.useCallback(() => setActiveHour(null), []);

  const chartData = React.useMemo<HourDatum[]>(() => {
    const hourlyData: { [hour: string]: { totalPnl: number; count: number } } =
      {};

    // Initialize hourly data for all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalPnl: 0, count: 0 };
    }

    // Sum up PNL and count trades for each hour in user's timezone
    trades.forEach((trade: Trade) => {
      const hour = formatInTimeZone(new Date(trade.entryDate), timezone, "H");
      hourlyData[hour].totalPnl += trade.pnl;
      hourlyData[hour].count++;
    });

    // Convert to array format for Recharts and calculate average PNL
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgPnl: data.count > 0 ? data.totalPnl / data.count : 0,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [trades, timezone]);

  const hasData = chartData.some((entry) => entry.tradeCount > 0);
  const hasFilter = hourFilter.hour !== null;

  const interactiveLabel =
    activeHour !== null
      ? `${t("filters.title")}: ${hourRangeLabel(activeHour)}`
      : `${t("filters.title")}: ${t("pnlTime.title")}`;

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("pnlTime.title")}
        description={t("pnlTime.description")}
        actions={
          hasFilter ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setHourFilter({ hour: null })}
            >
              {t("pnlTime.clearFilter")}
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
            data={LOADING_MOCK_HOURLY}
            xDataKey="hour"
            yDataKey="avgPnl"
            marginVariant="hourly"
            yAxisWidth={45}
            xTickCount={8}
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
                data={chartData}
                margin={chartMargin(size)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <WidgetChartGrid />
                <XAxis
                  dataKey="hour"
                  {...axisProps(size)}
                  height={isCompactSize(size) ? 20 : 24}
                  tickFormatter={(value) => `${value}h`}
                  ticks={
                    isCompactSize(size)
                      ? [0, 6, 12, 18]
                      : [0, 3, 6, 9, 12, 15, 18, 21]
                  }
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
                  content={<HourTooltip t={t} locale={locale} />}
                  cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Bar
                  dataKey="avgPnl"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={isCompactSize(size) ? 25 : 40}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.hour}`}
                      fill={pnlToneFill(pnlTone(entry.avgPnl))}
                      fillOpacity={
                        !hasFilter || hourFilter.hour === entry.hour ? 1 : 0.3
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
