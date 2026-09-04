"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useData } from "@/context/data-provider";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { Button } from "@/components/ui/button";
import { useTickDetailsStore } from "@/store/tick-details-store";
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_TICKS,
} from "./chart-loading-skeleton";
import { countPeakConclusion } from "./chart-conclusions";
import {
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  filterBarOpacity,
  honestPositiveDomain,
  unsignedFill,
} from "./chart-glance";
import { GlanceBar } from "./chart-glance-bar";
import {
  canDrawUnitHistogram,
  UnitHistogram,
} from "./chart-unit-histogram";
import { ChartWidgetFrame } from "./chart-widget-frame";

interface TickDistributionProps {
  size?: WidgetSize;
}

interface ChartDataPoint {
  ticks: string;
  count: number;
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
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={CHART_TOOLTIP_CLASS}>
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("tickDistribution.tooltip.ticks")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.ticks}{" "}
              {parseInt(data.ticks) !== 1
                ? t("tickDistribution.tooltip.ticks_plural")
                : t("tickDistribution.tooltip.tick")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("tickDistribution.tooltip.trades")}
            </span>
            <span className="font-bold">
              {data.count}{" "}
              {data.count !== 1
                ? t("tickDistribution.tooltip.trades_plural")
                : t("tickDistribution.tooltip.trade")}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

export default function TickDistributionChart({
  size = "medium",
}: TickDistributionProps) {
  const { formattedTrades: trades, tickFilter, setTickFilter, isLoading } =
    useData();
  const tickDetails = useTickDetailsStore((state) => state.tickDetails);
  const t = useI18n();

  const chartData = React.useMemo(() => {
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

  const handleBarClick = (data: any) => {
    if (!data || !trades.length) return;
    const clickedTicks = data.ticks;
    if (tickFilter.value === clickedTicks) {
      setTickFilter({ value: null });
    } else {
      setTickFilter({ value: clickedTicks });
    }
  };

  const conclusion = countPeakConclusion(
    chartData.map((entry) => ({ label: entry.ticks, count: entry.count })),
  );
  const useStacks = canDrawUnitHistogram(chartData.map((entry) => entry.count));
  const subtitle =
    conclusion.kind === "empty"
      ? t("tickDistribution.subtitle.empty")
      : t(
          useStacks
            ? "tickDistribution.subtitle.peakStacks"
            : "tickDistribution.subtitle.peak",
          { label: conclusion.label },
        );
  const hasFilter = Boolean(tickFilter.value);

  return (
    <ChartWidgetFrame
      size={size}
      title={t("tickDistribution.title")}
      subtitle={subtitle}
      description={t("tickDistribution.description")}
      actions={
        hasFilter ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={() => setTickFilter({ value: null })}
          >
            {t("tickDistribution.clearFilter")}
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <BarChartLoadingSkeleton
          size={size}
          data={LOADING_MOCK_TICKS}
          xDataKey="ticks"
          yDataKey="count"
          yAxisWidth={45}
          showReferenceLine={false}
          domain={honestPositiveDomain(LOADING_MOCK_TICKS.map((d) => d.count))}
        />
      ) : (
        useStacks ? (
          <UnitHistogram
            size={size}
            label={subtitle}
            activeKey={tickFilter.value}
            hasFilter={hasFilter}
            onSelect={(key) => handleBarClick({ ticks: key })}
            buckets={chartData.map((entry) => ({
              key: entry.ticks,
              label: entry.ticks,
              count: entry.count,
              signed: Number(entry.ticks.replace("+", "")),
            }))}
          />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={getChartMargins(size, "hourly")}
            onClick={(e) =>
              e?.activePayload && handleBarClick(e.activePayload[0].payload)
            }
          >
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="ticks"
              tickLine={false}
              axisLine={false}
              height={size === "small" ? 20 : 24}
              tickMargin={size === "small" ? 4 : 8}
              tick={(props) => {
                const { x, y, payload } = props;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={size === "small" ? 8 : 4}
                      textAnchor={size === "small" ? "end" : "middle"}
                      fill="currentColor"
                      fontSize={size === "small" ? 9 : 11}
                      fontWeight={600}
                      transform={
                        size === "small" ? "rotate(-45)" : "rotate(0)"
                      }
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
              interval="preserveStartEnd"
              allowDataOverflow={true}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={45}
              tickMargin={4}
              tickFormatter={formatCount}
              tick={chartTickStyle(size)}
              domain={honestPositiveDomain(chartData.map((entry) => entry.count))}
            />
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
            <Bar
              dataKey="count"
              fill={unsignedFill()}
              maxBarSize={chartMaxBarSize(size)}
              shape={<GlanceBar />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.ticks}`}
                  opacity={filterBarOpacity(
                    tickFilter.value === entry.ticks,
                    hasFilter,
                  )}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )
      )}
    </ChartWidgetFrame>
  );
}
