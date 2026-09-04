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
  ReferenceLine,
} from "recharts";
import { useData } from "@/context/data-provider";
import { Trade } from "@/prisma/generated/prisma/browser";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { useUserStore } from "../../../../../store/user-store";
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_HOURLY,
} from "./chart-loading-skeleton";
import { namedSignedConclusion } from "./chart-conclusions";
import {
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  CHART_ZERO_LINE_PROPS,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  filterBarOpacity,
  honestSignedDomain,
  signedFill,
} from "./chart-glance";
import { GlanceBar } from "./chart-glance-bar";
import { ChartWidgetFrame } from "./chart-widget-frame";

interface TimeOfDayTradeChartProps {
  size?: WidgetSize;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

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

  const handleClick = React.useCallback(() => {
    if (activeHour === null) return;
    if (hourFilter.hour === activeHour) {
      setHourFilter({ hour: null });
    } else {
      setHourFilter({ hour: activeHour });
    }
  }, [activeHour, hourFilter.hour, setHourFilter]);

  const chartData = React.useMemo(() => {
    const hourlyData: { [hour: string]: { totalPnl: number; count: number } } =
      {};

    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalPnl: 0, count: 0 };
    }

    trades.forEach((trade: Trade) => {
      const hour = formatInTimeZone(new Date(trade.entryDate), timezone, "H");
      hourlyData[hour].totalPnl += trade.pnl;
      hourlyData[hour].count++;
    });

    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgPnl: data.count > 0 ? data.totalPnl / data.count : 0,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [trades, timezone]);

  const conclusion = namedSignedConclusion(
    chartData.map((entry) => ({
      label: String(entry.hour),
      value: entry.avgPnl,
    })),
  );
  const subtitle =
    conclusion.kind === "empty"
      ? t("pnlTime.subtitle.empty")
      : t(`pnlTime.subtitle.${conclusion.kind}`, { label: conclusion.label });

  const CustomTooltip = ({ active, payload, label }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length) {
        setActiveHour(payload[0].payload.hour);
      } else {
        setActiveHour(null);
      }
    }, [active, payload]);

    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={CHART_TOOLTIP_CLASS}>
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("pnlTime.tooltip.time")}
              </span>
              <span className="font-bold text-muted-foreground">
                {`${label}:00 - ${(label + 1) % 24}:00`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("pnlTime.tooltip.averagePnl")}
              </span>
              <span className="font-bold">{formatCurrency(data.avgPnl)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("pnlTime.tooltip.trades")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.tradeCount}{" "}
                {data.tradeCount === 1
                  ? t("pnlTime.tooltip.trade")
                  : t("pnlTime.tooltip.trades_plural")}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const hasFilter = hourFilter.hour !== null;

  return (
    <ChartWidgetFrame
      size={size}
      title={t("pnlTime.title")}
      subtitle={subtitle}
      description={t("pnlTime.description")}
      contentInteractive
      onContentClick={handleClick}
      actions={
        hasFilter ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={() => setHourFilter({ hour: null })}
          >
            {t("pnlTime.clearFilter")}
          </Button>
        ) : null
      }
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
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={getChartMargins(size, "hourly")}>
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
              tickFormatter={formatCurrency}
              domain={honestSignedDomain(chartData.map((entry) => entry.avgPnl))}
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
              dataKey="avgPnl"
              maxBarSize={chartMaxBarSize(size)}
              shape={<GlanceBar />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.hour}`}
                  fill={signedFill(entry.avgPnl)}
                  opacity={filterBarOpacity(
                    hourFilter.hour === entry.hour,
                    hasFilter,
                  )}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  );
}
