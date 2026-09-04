"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/context/data-provider";
import { Trade } from "@/prisma/generated/prisma/browser";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_HOURLY_TIME,
} from "./chart-loading-skeleton";
import { countPeakConclusion } from "./chart-conclusions";
import {
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  honestPositiveDomain,
  unsignedFill,
} from "./chart-glance";
import { GlanceBar } from "./chart-glance-bar";
import { ChartWidgetFrame } from "./chart-widget-frame";

interface TimeInPositionChartProps {
  size?: WidgetSize;
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
};

export default function TimeInPositionChart({
  size = "medium",
}: TimeInPositionChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();

  const chartData = React.useMemo(() => {
    const hourlyData: { [hour: string]: { totalTime: number; count: number } } =
      {};

    // Initialize hourly data for all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalTime: 0, count: 0 };
    }

    // Sum up time in position and count trades for each hour in UTC
    trades.forEach((trade: Trade) => {
      const hour = formatInTimeZone(new Date(trade.entryDate), "UTC", "H");
      hourlyData[hour].totalTime += trade.timeInPosition / 60; // Convert seconds to minutes
      hourlyData[hour].count++;
    });

    // Convert to array format for Recharts and calculate average time in position
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgTimeInPosition: data.count > 0 ? data.totalTime / data.count : 0,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [trades]);

  const conclusion = countPeakConclusion(
    chartData.map((entry) => ({
      label: String(entry.hour),
      count: entry.avgTimeInPosition,
    })),
  );
  const subtitle =
    conclusion.kind === "empty"
      ? t("timeInPosition.subtitle.empty")
      : t("timeInPosition.subtitle.peak", { label: conclusion.label });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={CHART_TOOLTIP_CLASS}>
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("timeInPosition.tooltip.time")}
              </span>
              <span className="font-bold text-muted-foreground">
                {`${label}:00 - ${(label + 1) % 24}:00`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("timeInPosition.tooltip.averageDuration")}
              </span>
              <span className="font-bold">
                {formatTime(data.avgTimeInPosition)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("timeInPosition.tooltip.trades")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.tradeCount}{" "}
                {data.tradeCount !== 1
                  ? t("timeInPosition.tooltip.trades_plural")
                  : t("timeInPosition.tooltip.trade")}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWidgetFrame
      size={size}
      title={t("timeInPosition.title")}
      subtitle={subtitle}
      description={t("timeInPosition.description")}
    >
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
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={getChartMargins(size, "hourly")}
          >
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              height={size === "small" ? 20 : 24}
              tickMargin={size === "small" ? 4 : 8}
              tick={chartTickStyle(size)}
              tickFormatter={(value) => `${value}h`}
              ticks={
                size === "small"
                  ? [0, 6, 12, 18]
                  : [0, 3, 6, 9, 12, 15, 18, 21]
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={45}
              tickMargin={4}
              tick={chartTickStyle(size)}
              tickFormatter={formatTime}
              domain={honestPositiveDomain(
                chartData.map((entry) => entry.avgTimeInPosition),
              )}
            />
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
            <Bar
              dataKey="avgTimeInPosition"
              fill={unsignedFill()}
              maxBarSize={chartMaxBarSize(size)}
              shape={<GlanceBar />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={unsignedFill()} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  );
}
