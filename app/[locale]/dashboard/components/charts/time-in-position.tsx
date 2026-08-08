"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/context/data-provider";
import { Trade } from "@/prisma/generated/prisma/browser";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_HOURLY_TIME,
} from "./chart-loading-skeleton";
import {
  WidgetBody,
  WidgetCard,
  WidgetChartGrid,
  WidgetEmpty,
  WidgetFooter,
  WidgetHeader,
  WidgetTooltip,
  axisProps,
  chartColors,
  chartMargin,
  formatCount,
  formatDuration,
  isCompactSize,
} from "../widgets";

interface TimeInPositionChartProps {
  size?: WidgetSize;
}

interface HourDurationDatum {
  hour: number;
  /** Average holding time for the hour, in seconds. */
  avgTimeInPosition: number;
  tradeCount: number;
}

export default function TimeInPositionChart({
  size = "medium",
}: TimeInPositionChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();
  const locale = useCurrentLocale();
  const compact = isCompactSize(size);

  const chartData = React.useMemo<HourDurationDatum[]>(() => {
    const hourlyData: { [hour: string]: { totalTime: number; count: number } } =
      {};

    // Initialize hourly data for all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalTime: 0, count: 0 };
    }

    // Sum up time in position (seconds) and count trades for each hour in UTC
    trades.forEach((trade: Trade) => {
      const hour = formatInTimeZone(new Date(trade.entryDate), "UTC", "H");
      hourlyData[hour].totalTime += trade.timeInPosition;
      hourlyData[hour].count++;
    });

    // Convert to array format for Recharts and calculate average time in position
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        // Guard the division: an hour with no trades is 0s, never NaN.
        avgTimeInPosition: data.count > 0 ? data.totalTime / data.count : 0,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [trades]);

  const totals = React.useMemo(
    () =>
      chartData.reduce(
        (acc, row) => ({
          trades: acc.trades + row.tradeCount,
          time: acc.time + row.avgTimeInPosition * row.tradeCount,
        }),
        { trades: 0, time: 0 },
      ),
    [chartData],
  );

  const hasData = totals.trades > 0;
  const overallAverage = hasData ? totals.time / totals.trades : 0;

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("timeInPosition.title")}
        description={t("timeInPosition.description")}
      />
      <WidgetBody size={size} flush className={cn(compact ? "p-1" : "p-2")}>
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_HOURLY_TIME}
            xDataKey="hour"
            yDataKey="avgTimeInPosition"
            marginVariant="hourly"
            yAxisWidth={45}
            xTickCount={8}
          />
        ) : !hasData ? (
          <WidgetEmpty size={size} message={t("widgets.empty.noTrades")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin(size)}>
              <WidgetChartGrid />
              <XAxis
                dataKey="hour"
                {...axisProps(size)}
                height={compact ? 20 : 24}
                tickFormatter={(value: number) => `${value}h`}
                ticks={
                  compact ? [0, 6, 12, 18] : [0, 3, 6, 9, 12, 15, 18, 21]
                }
              />
              <YAxis
                {...axisProps(size)}
                width={compact ? 40 : 48}
                // A duration is unsigned, so the length encoding sits on its
                // natural zero baseline with no cropped domain.
                tickFormatter={(value: number) => formatDuration(value)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 1000 }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as HourDurationDatum;
                  return (
                    <WidgetTooltip
                      title={`${row.hour}:00 - ${(row.hour + 1) % 24}:00`}
                      rows={[
                        {
                          label: t("timeInPosition.tooltip.averageDuration"),
                          value: formatDuration(row.avgTimeInPosition),
                        },
                        {
                          label: t("timeInPosition.tooltip.trades"),
                          value: formatCount(row.tradeCount, locale),
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="avgTimeInPosition"
                radius={[3, 3, 0, 0]}
                maxBarSize={compact ? 25 : 40}
                // Holding time is an unsigned magnitude already carried by bar
                // length, so it stays monochrome: no intensity ramp.
                fill={chartColors.neutral}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </WidgetBody>
      <WidgetFooter size={size}>
        <span>
          {t("timeInPosition.tooltip.averageDuration")} · UTC
        </span>
        <span className="tabular-nums">
          {formatDuration(overallAverage)} ·{" "}
          {formatCount(totals.trades, locale)}{" "}
          {t("tickDistribution.tooltip.trades")}
        </span>
      </WidgetFooter>
    </WidgetCard>
  );
}
