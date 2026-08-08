"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/context/data-provider";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n, useCurrentLocale } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import { fr, enUS } from "date-fns/locale";
import { useUserStore } from "@/store/user-store";
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
  WidgetEmpty,
  WidgetHeader,
  WidgetTooltip,
  WidgetZeroLine,
} from "../widgets";
import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_DATE_PNL,
} from "./chart-loading-skeleton";

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

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const t = useI18n();
  const locale = useCurrentLocale();
  const { timezone } = useUserStore();
  const dateLocale = locale === "fr" ? fr : enUS;

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const date = new Date(data.date + "T00:00:00Z");
    return (
      <WidgetTooltip
        title={formatInTimeZone(date, timezone, "MMM d, yyyy", {
          locale: dateLocale,
        })}
        rows={[
          {
            label: t("pnl.tooltip.pnl"),
            value: formatCurrency(data.pnl, locale),
            toneClassName: pnlToneClass(pnlTone(data.pnl)),
          },
          {
            label: t("pnl.tooltip.longTrades"),
            value: formatCount(data.longNumber, locale),
          },
          {
            label: t("pnl.tooltip.shortTrades"),
            value: formatCount(data.shortNumber, locale),
          },
        ]}
      />
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

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("pnl.title")}
        description={t("pnl.description")}
      />
      <WidgetBody
        size={size}
        flush
        className={cn(isCompactSize(size) ? "p-1" : "p-2")}
      >
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_DATE_PNL}
            xDataKey="date"
            yDataKey="pnl"
            marginVariant="default"
          />
        ) : chartData.length === 0 ? (
          <WidgetEmpty size={size} message={t("chat.noTradesAvailable")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin(size)}>
              <WidgetChartGrid />
              <XAxis
                dataKey="date"
                {...axisProps(size)}
                height={isCompactSize(size) ? 20 : 24}
                minTickGap={isCompactSize(size) ? 30 : 50}
                tickFormatter={(value) => {
                  const date = new Date(value + "T00:00:00Z");
                  return formatInTimeZone(date, timezone, "MMM d", {
                    locale: dateLocale,
                  });
                }}
              />
              <YAxis
                {...axisProps(size)}
                width={56}
                tickFormatter={(value: number) =>
                  formatCompactCurrency(value, locale)
                }
              />
              <WidgetZeroLine />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                wrapperStyle={{ zIndex: 1000 }}
              />
              <Bar
                dataKey="pnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={isCompactSize(size) ? 25 : 40}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={pnlToneFill(pnlTone(entry.pnl))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </WidgetBody>
    </WidgetCard>
  );
}
