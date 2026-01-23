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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import { useData } from "@/context/data-provider";
import { Trade } from "@/prisma/generated/prisma/browser";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { useUserStore } from "../../../../../store/user-store";

interface TimeOfDayTradeChartProps {
  size?: WidgetSize;
}

const chartConfig = {
  avgPnl: {
    label: "Average P/L",
    color: "hsl(var(--chart-loss))",
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function TimeOfDayTradeChart({
  size = "medium",
}: TimeOfDayTradeChartProps) {
  const { formattedTrades: trades, hourFilter, setHourFilter } = useData();
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

  const maxTradeCount = Math.max(...chartData.map((data) => data.tradeCount));
  const maxPnL = Math.max(...chartData.map((data) => data.avgPnl));
  const minPnL = Math.min(...chartData.map((data) => data.avgPnl));

  const getColor = (count: number) => {
    const intensity = Math.max(0.2, count / maxTradeCount);
    return `hsl(var(--chart-4) / ${intensity})`;
  };

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
        <div className="rounded-lg border bg-background p-2 shadow-xs">
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
              {t("pnlTime.title")}
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
                  <p>{t("pnlTime.description")}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          {hourFilter.hour !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setHourFilter({ hour: null })}
            >
              {t("pnlTime.clearFilter")}
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
        <div className="w-full h-full cursor-pointer" onClick={handleClick}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={
                size === "small"
                  ? { left: 0, right: 4, top: 4, bottom: 20 }
                  : { left: 0, right: 8, top: 8, bottom: 24 }
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                height={size === "small" ? 20 : 24}
                tickMargin={size === "small" ? 4 : 8}
                tick={{
                  fontSize: size === "small" ? 9 : 11,
                  fill: "currentColor",
                }}
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
                tick={{
                  fontSize: size === "small" ? 9 : 11,
                  fill: "currentColor",
                }}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{
                  fontSize: size === "small" ? "10px" : "12px",
                  zIndex: 1000,
                }}
              />
              <Bar
                dataKey="avgPnl"
                fill={chartConfig.avgPnl.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={size === "small" ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
                opacity={hourFilter.hour !== null ? 0.3 : 1}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.hour}`}
                    fill={getColor(entry.tradeCount)}
                    opacity={
                      hourFilter.hour === entry.hour
                        ? 1
                        : hourFilter.hour !== null
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
