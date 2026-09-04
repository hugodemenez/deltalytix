"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useData } from "@/context/data-provider";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n, useCurrentLocale } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import { fr, enUS } from "date-fns/locale";
import { useUserStore } from "@/store/user-store";
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_DATE_PNL,
} from "./chart-loading-skeleton";
import { dailyPnlConclusion } from "./chart-conclusions";
import {
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  CHART_ZERO_LINE_PROPS,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  honestSignedDomain,
  signedFill,
} from "./chart-glance";
import { LollipopBar } from "./chart-lollipop-bar";
import { ChartWidgetFrame } from "./chart-widget-frame";

interface PNLChartProps {
  size?: WidgetSize;
}

interface ChartDataPoint {
  date: string;
  pnl: number;
  shortNumber: number;
  longNumber: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const formatCurrency = (value: number) => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${value < 0 ? "-" : ""}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${value < 0 ? "-" : ""}$${(absValue / 1000).toFixed(1)}k`;
  }
  return `${value < 0 ? "-" : ""}$${absValue.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const t = useI18n();
  const locale = useCurrentLocale();
  const { timezone } = useUserStore();
  const dateLocale = locale === "fr" ? fr : enUS;

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const date = new Date(data.date + "T00:00:00Z");
    return (
      <div className={CHART_TOOLTIP_CLASS}>
        <p className="font-semibold">
          {formatInTimeZone(date, timezone, "MMM d, yyyy", {
            locale: dateLocale,
          })}
        </p>
        <p
          className={`font-bold ${data.pnl >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          {t("pnl.tooltip.pnl")}: {formatCurrency(data.pnl)}
        </p>
        <p>
          {t("pnl.tooltip.longTrades")}: {data.longNumber}
        </p>
        <p>
          {t("pnl.tooltip.shortTrades")}: {data.shortNumber}
        </p>
      </div>
    );
  }
  return null;
};

export default function PNLChart({ size = "medium" }: PNLChartProps) {
  const { calendarData, isLoading } = useData();
  const t = useI18n();
  const locale = useCurrentLocale();
  const { timezone } = useUserStore();
  const dateLocale = locale === "fr" ? fr : enUS;

  const chartData = React.useMemo(
    () =>
      Object.entries(calendarData)
        .map(([date, values]) => ({
          date,
          pnl: values.pnl,
          shortNumber: values.shortNumber,
          longNumber: values.longNumber,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
    [calendarData],
  );

  const conclusion = dailyPnlConclusion(chartData.map((point) => point.pnl));
  const subtitle =
    conclusion.kind === "empty"
      ? t("pnl.subtitle.empty")
      : conclusion.kind === "greenDays"
        ? t("pnl.subtitle.greenDays", conclusion)
        : t("pnl.subtitle.redDays", conclusion);

  return (
    <ChartWidgetFrame
      size={size}
      title={t("pnl.title")}
      subtitle={subtitle}
      description={t("pnl.description")}
    >
      {isLoading ? (
        <BarChartLoadingSkeleton
          size={size}
          data={LOADING_MOCK_DATE_PNL}
          xDataKey="date"
          yDataKey="pnl"
          marginVariant="default"
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={getChartMargins(size)}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              height={size === "small" ? 20 : 24}
              tickMargin={size === "small" ? 4 : 8}
              tick={chartTickStyle(size)}
              minTickGap={size === "small" ? 30 : 50}
              tickFormatter={(value) => {
                const date = new Date(value + "T00:00:00Z");
                return formatInTimeZone(date, timezone, "MMM d", {
                  locale: dateLocale,
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={60}
              tickMargin={4}
              tick={chartTickStyle(size)}
              tickFormatter={formatCurrency}
              domain={honestSignedDomain(chartData.map((point) => point.pnl))}
            />
            <ReferenceLine y={0} {...CHART_ZERO_LINE_PROPS} />
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
            <Bar
              dataKey="pnl"
              maxBarSize={chartMaxBarSize(size)}
              shape={<LollipopBar />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={signedFill(entry.pnl)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  );
}
