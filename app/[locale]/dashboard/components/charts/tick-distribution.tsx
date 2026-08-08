"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CategoricalChartState } from "recharts/types/chart/types";
import { useData } from "@/context/data-provider";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { Button } from "@/components/ui/button";
import { useTickDetailsStore } from "@/store/tick-details-store";
import {
  axisProps,
  chartColors,
  chartMargin,
  chartTickFontSize,
  formatCount,
  formatTicks,
  isCompactSize,
  WidgetBody,
  WidgetCard,
  WidgetChartGrid,
  WidgetChartInteractive,
  WidgetEmpty,
  WidgetHeader,
  WidgetTooltip,
} from "../widgets";
import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_TICKS,
} from "./chart-loading-skeleton";

interface TickDistributionProps {
  size?: WidgetSize;
}

interface ChartDataPoint {
  ticks: string;
  count: number;
}

interface TickTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  t: ReturnType<typeof useI18n>;
  locale: string;
}

function TickTooltip({ active, payload, t, locale }: TickTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const tickValue = Number(data.ticks.replace("+", ""));
  const tickLabel = `${tickValue > 0 ? "+" : ""}${formatTicks(tickValue, locale)}`;
  return (
    <WidgetTooltip
      title={`${tickLabel} ${
        Math.abs(tickValue) === 1
          ? t("tickDistribution.tooltip.tick")
          : t("tickDistribution.tooltip.ticks_plural")
      }`}
      rows={[
        {
          label: t("tickDistribution.tooltip.trades"),
          value: formatCount(data.count, locale),
        },
      ]}
    />
  );
}

export default function TickDistributionChart({
  size = "medium",
}: TickDistributionProps) {
  const { formattedTrades: trades, tickFilter, setTickFilter, isLoading } =
    useData();
  const tickDetails = useTickDetailsStore((state) => state.tickDetails);
  const [activeTicks, setActiveTicks] = React.useState<string | null>(null);
  const t = useI18n();
  const locale = useCurrentLocale();

  const chartData = React.useMemo<ChartDataPoint[]>(() => {
    if (!trades.length) return [];

    // Create a map to store tick counts
    const tickCounts: Record<number, number> = {};

    // Count trades for each tick value
    trades.forEach((trade) => {
      // Fix ticker matching logic - sort by length descending to match longer tickers first
      // This prevents "ES" from matching "MES" trades
      const matchingTicker = Object.keys(tickDetails)
        .sort((a, b) => b.length - a.length) // Sort by length descending
        .find((ticker) => trade.instrument.includes(ticker));

      // Use tickValue (monetary value per tick) instead of tickSize (minimum price increment)
      const tickValue = matchingTicker
        ? tickDetails[matchingTicker].tickValue
        : 1;

      // Calculate PnL per contract first
      const pnlPerContract = Number(trade.pnl) / Number(trade.quantity);
      const ticks = Math.round(pnlPerContract / tickValue);
      tickCounts[ticks] = (tickCounts[ticks] || 0) + 1;
    });

    // Convert the tick counts to sorted chart data
    return Object.entries(tickCounts)
      .map(([tick, count]) => ({
        ticks: tick === "0" ? "0" : Number(tick) > 0 ? `+${tick}` : `${tick}`,
        count,
      }))
      .sort(
        (a, b) =>
          Number(a.ticks.replace("+", "")) - Number(b.ticks.replace("+", "")),
      );
  }, [trades, tickDetails]);

  const handleActivate = React.useCallback(() => {
    if (activeTicks === null) return;
    if (tickFilter.value === activeTicks) {
      setTickFilter({ value: null });
    } else {
      setTickFilter({ value: activeTicks });
    }
  }, [activeTicks, tickFilter.value, setTickFilter]);

  const handleMouseMove = React.useCallback((state: CategoricalChartState) => {
    const point = state?.activePayload?.[0]?.payload as
      | ChartDataPoint
      | undefined;
    setActiveTicks(point ? point.ticks : null);
  }, []);

  const handleMouseLeave = React.useCallback(() => setActiveTicks(null), []);

  const hasFilter = Boolean(tickFilter.value);
  const interactiveLabel =
    activeTicks !== null
      ? `${t("filters.title")}: ${activeTicks} ${t("tickDistribution.tooltip.ticks")}`
      : `${t("filters.title")}: ${t("tickDistribution.title")}`;

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("tickDistribution.title")}
        description={t("tickDistribution.description")}
        actions={
          hasFilter ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setTickFilter({ value: null })}
            >
              {t("tickDistribution.clearFilter")}
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
            data={LOADING_MOCK_TICKS}
            xDataKey="ticks"
            yDataKey="count"
            yAxisWidth={45}
            showReferenceLine={false}
            domain={[
              0,
              Math.max(...LOADING_MOCK_TICKS.map((d) => d.count)) * 1.1,
            ]}
          />
        ) : chartData.length === 0 ? (
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
                  dataKey="ticks"
                  {...axisProps(size)}
                  height={isCompactSize(size) ? 20 : 24}
                  interval="preserveStartEnd"
                  allowDataOverflow
                  tick={(props: {
                    x: number;
                    y: number;
                    payload: { value: string };
                  }) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={isCompactSize(size) ? 8 : 4}
                          textAnchor={isCompactSize(size) ? "end" : "middle"}
                          fill={chartColors.tick}
                          fontSize={chartTickFontSize(size)}
                          transform={
                            isCompactSize(size) ? "rotate(-45)" : "rotate(0)"
                          }
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis
                  {...axisProps(size)}
                  width={45}
                  tickFormatter={(value: number) => formatCount(value, locale)}
                />
                <Tooltip
                  content={<TickTooltip t={t} locale={locale} />}
                  cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Bar
                  dataKey="count"
                  fill={chartColors.neutral}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={isCompactSize(size) ? 25 : 40}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.ticks}`}
                      fill={
                        tickFilter.value === entry.ticks
                          ? chartColors.primary
                          : chartColors.neutral
                      }
                      fillOpacity={
                        !hasFilter || tickFilter.value === entry.ticks ? 1 : 0.3
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
