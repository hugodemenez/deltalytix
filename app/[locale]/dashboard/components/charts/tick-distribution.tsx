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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import { useData } from "@/context/data-provider";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/locales/client";
import { Button } from "@/components/ui/button";
import { useTickDetailsStore } from "@/store/tick-details-store";

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

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-7))",
  },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const t = useI18n();
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-xs">
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
  const { formattedTrades: trades, tickFilter, setTickFilter } = useData();
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === "small" ? "p-2 h-10" : "p-3 sm:p-4 h-14",
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle
              className={cn(
                "line-clamp-1",
                size === "small" ? "text-sm" : "text-base",
              )}
            >
              {t("tickDistribution.title")}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info
                    className={cn(
                      "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                      size === "small" ? "h-3.5 w-3.5" : "h-4 w-4",
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t("tickDistribution.description")}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          {tickFilter.value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setTickFilter({ value: null })}
            >
              {t("tickDistribution.clearFilter")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex-1 min-h-0",
          size === "small" ? "p-1" : "p-2 sm:p-4",
        )}
      >
        <div className={cn("w-full h-full")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={
                size === "small"
                  ? { left: 0, right: 4, top: 4, bottom: 20 }
                  : { left: 0, right: 8, top: 8, bottom: 24 }
              }
              onClick={(e) =>
                e?.activePayload && handleBarClick(e.activePayload[0].payload)
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
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
                tick={{
                  fontSize: size === "small" ? 9 : 11,
                  fill: "currentColor",
                }}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{
                  fontSize: size === "small" ? "10px" : "12px",
                  zIndex: 1000,
                }}
              />
              <Bar
                dataKey="count"
                fill={chartConfig.count.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={size === "small" ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
                opacity={tickFilter.value ? 0.3 : 1}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.ticks}`}
                    opacity={
                      tickFilter.value === entry.ticks
                        ? 1
                        : tickFilter.value
                          ? 0.3
                          : 1
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
