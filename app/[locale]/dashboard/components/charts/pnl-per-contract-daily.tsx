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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import { useData } from "@/context/data-provider";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { usePnLPerContractDailyStore } from "@/store/pnl-per-contract-daily-store";
import { formatInTimeZone } from "date-fns-tz";
import { fr, enUS } from "date-fns/locale";
import { useUserStore } from "@/store/user-store";
import { useCurrentLocale } from "@/locales/client";
import { Button } from "@/components/ui/button";

interface PnLPerContractDailyChartProps {
  size?: WidgetSize;
}

const chartConfig = {
  pnl: {
    label: "Avg Net P/L per Contract",
    color: "hsl(var(--chart-loss))",
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const CustomTooltip = ({ active, payload, label }: any) => {
  const t = useI18n();
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-xs">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContractDaily.tooltip.date")}
            </span>
            <span className="font-bold text-muted-foreground">{data.date}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContractDaily.tooltip.averagePnl")}
            </span>
            <span className="font-bold">{formatCurrency(data.averagePnl)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContractDaily.tooltip.totalPnl")}
            </span>
            <span className="font-bold text-muted-foreground">
              {formatCurrency(data.totalPnl)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContractDaily.tooltip.trades")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} {t("pnlPerContractDaily.tooltip.trades")} (
              {((data.winCount / data.tradeCount) * 100).toFixed(1)}%{" "}
              {t("pnlPerContractDaily.tooltip.winRate")})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContractDaily.tooltip.totalContracts")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.totalContracts} {t("pnlPerContractDaily.tooltip.contracts")}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PnLPerContractDailyChart({
  size = "medium",
}: PnLPerContractDailyChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const { timezone } = useUserStore();
  const { config, setSelectedInstrument } = usePnLPerContractDailyStore();
  const t = useI18n();
  const locale = useCurrentLocale();
  const dateLocale = locale === "fr" ? fr : enUS;

  // Get unique instruments from trades
  const availableInstruments = React.useMemo(() => {
    const instruments = Array.from(
      new Set(trades.map((trade) => trade.instrument).filter(Boolean)),
    );
    return instruments.sort();
  }, [trades]);

  // Set default instrument if none selected and instruments are available
  React.useEffect(() => {
    if (!config.selectedInstrument && availableInstruments.length > 0) {
      setSelectedInstrument(availableInstruments[0]);
    }
  }, [config.selectedInstrument, availableInstruments, setSelectedInstrument]);

  const chartData = React.useMemo(() => {
    if (!config.selectedInstrument) return [];

    // Filter trades for selected instrument
    const instrumentTrades = trades.filter(
      (trade) => trade.instrument === config.selectedInstrument,
    );

    // Group trades by date
    const dateGroups = instrumentTrades.reduce(
      (acc, trade) => {
        const entryDate = new Date(trade.entryDate);
        const dateKey = formatInTimeZone(entryDate, timezone, "yyyy-MM-dd");

        if (!acc[dateKey]) {
          acc[dateKey] = {
            trades: [],
            totalPnl: 0,
            totalContracts: 0,
            winCount: 0,
          };
        }

        const netPnl = trade.pnl - (trade.commission || 0);
        acc[dateKey].trades.push(trade);
        acc[dateKey].totalPnl += netPnl;
        acc[dateKey].totalContracts += trade.quantity;
        if (netPnl > 0) {
          acc[dateKey].winCount++;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          trades: any[];
          totalPnl: number;
          totalContracts: number;
          winCount: number;
        }
      >,
    );

    // Convert to chart data format and sort by date
    return Object.entries(dateGroups)
      .map(([date, data]) => ({
        date,
        averagePnl:
          data.totalContracts > 0 ? data.totalPnl / data.totalContracts : 0,
        totalPnl: data.totalPnl,
        tradeCount: data.trades.length,
        winCount: data.winCount,
        totalContracts: data.totalContracts,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades, config.selectedInstrument, timezone]);

  const maxPnL = Math.max(...chartData.map((d) => d.averagePnl));
  const minPnL = Math.min(...chartData.map((d) => d.averagePnl));
  const absMax = Math.max(Math.abs(maxPnL), Math.abs(minPnL));

  const getColor = (value: number) => {
    const ratio = Math.abs(value / absMax);
    const baseColorVar = value >= 0 ? "--chart-win" : "--chart-loss";
    const intensity = Math.max(0.2, ratio);
    return `hsl(var(${baseColorVar}) / ${intensity})`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b shrink-0",
          size === "small" ? "p-2" : "p-3 sm:p-4",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle
              className={cn(
                "line-clamp-1",
                size === "small" ? "text-sm" : "text-base",
              )}
            >
              {t("pnlPerContractDaily.title")}
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
                  <p>{t("pnlPerContractDaily.description")}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={config.selectedInstrument}
              onValueChange={setSelectedInstrument}
            >
              <SelectTrigger
                className={cn(
                  "w-[120px]",
                  size === "small" ? "h-7 text-xs" : "h-8 text-sm",
                )}
              >
                <SelectValue
                  placeholder={t("pnlPerContractDaily.selectInstrument")}
                />
              </SelectTrigger>
              <SelectContent>
                {availableInstruments.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {instrument}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex-1 min-h-0",
          size === "small" ? "p-1" : "p-2 sm:p-4",
        )}
      >
        <div className={cn("w-full h-full")}>
          {isLoading ? (
            (() => {
              const loadingMockData = [
                {
                  date: "2024-12-02",
                  averagePnl: 12.444999999999999,
                  totalPnl: 99.55999999999999,
                  tradeCount: 8,
                  winCount: 2,
                  totalContracts: 8,
                },
                {
                  date: "2024-12-03",
                  averagePnl: 59.32,
                  totalPnl: 237.28,
                  tradeCount: 4,
                  winCount: 4,
                  totalContracts: 4,
                },
                {
                  date: "2024-12-11",
                  averagePnl: 28.069999999999997,
                  totalPnl: 224.55999999999997,
                  tradeCount: 8,
                  winCount: 4,
                  totalContracts: 8,
                },
                {
                  date: "2024-12-16",
                  averagePnl: -34.43,
                  totalPnl: -68.86,
                  tradeCount: 2,
                  winCount: 0,
                  totalContracts: 2,
                },
                {
                  date: "2024-12-17",
                  averagePnl: -3.18,
                  totalPnl: -6.36,
                  tradeCount: 2,
                  winCount: 0,
                  totalContracts: 2,
                },
                {
                  date: "2024-12-19",
                  averagePnl: 48.90333333333333,
                  totalPnl: 293.41999999999996,
                  tradeCount: 6,
                  winCount: 4,
                  totalContracts: 6,
                },
                {
                  date: "2024-12-20",
                  averagePnl: 17.653333333333332,
                  totalPnl: 105.92,
                  tradeCount: 6,
                  winCount: 2,
                  totalContracts: 6,
                },
                {
                  date: "2025-01-06",
                  averagePnl: 59.32,
                  totalPnl: 237.28,
                  tradeCount: 3,
                  winCount: 3,
                  totalContracts: 4,
                },
                {
                  date: "2025-01-07",
                  averagePnl: 74.94500000000001,
                  totalPnl: 599.5600000000001,
                  tradeCount: 6,
                  winCount: 6,
                  totalContracts: 8,
                },
                {
                  date: "2025-01-14",
                  averagePnl: 28.07,
                  totalPnl: 224.56,
                  tradeCount: 6,
                  winCount: 3,
                  totalContracts: 8,
                },
                {
                  date: "2025-01-15",
                  averagePnl: -3.18,
                  totalPnl: -12.72,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 4,
                },
                {
                  date: "2025-01-21",
                  averagePnl: 28.07,
                  totalPnl: 224.56,
                  tradeCount: 6,
                  winCount: 3,
                  totalContracts: 8,
                },
                {
                  date: "2025-01-22",
                  averagePnl: 59.32,
                  totalPnl: 474.56,
                  tradeCount: 6,
                  winCount: 6,
                  totalContracts: 8,
                },
                {
                  date: "2025-01-23",
                  averagePnl: 74.945,
                  totalPnl: 599.56,
                  tradeCount: 6,
                  winCount: 6,
                  totalContracts: 8,
                },
                {
                  date: "2025-01-24",
                  averagePnl: -34.43000000000001,
                  totalPnl: -413.1600000000001,
                  tradeCount: 9,
                  winCount: 0,
                  totalContracts: 12,
                },
                {
                  date: "2025-01-28",
                  averagePnl: -3.18,
                  totalPnl: -38.160000000000004,
                  tradeCount: 9,
                  winCount: 0,
                  totalContracts: 12,
                },
                {
                  date: "2025-01-31",
                  averagePnl: 59.32,
                  totalPnl: 237.28,
                  tradeCount: 3,
                  winCount: 3,
                  totalContracts: 4,
                },
                {
                  date: "2025-02-20",
                  averagePnl: 59.32000000000001,
                  totalPnl: 593.2,
                  tradeCount: 6,
                  winCount: 6,
                  totalContracts: 10,
                },
                {
                  date: "2025-02-25",
                  averagePnl: 59.32000000000001,
                  totalPnl: 296.6,
                  tradeCount: 3,
                  winCount: 3,
                  totalContracts: 5,
                },
                {
                  date: "2025-02-27",
                  averagePnl: -96.93,
                  totalPnl: -484.65000000000003,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 5,
                },
                {
                  date: "2025-03-12",
                  averagePnl: 21.82,
                  totalPnl: 109.1,
                  tradeCount: 3,
                  winCount: 2,
                  totalContracts: 5,
                },
                {
                  date: "2025-03-18",
                  averagePnl: -3.1799999999999997,
                  totalPnl: -15.899999999999999,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 5,
                },
                {
                  date: "2025-03-19",
                  averagePnl: -3.1799999999999997,
                  totalPnl: -15.899999999999999,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 5,
                },
                {
                  date: "2025-03-20",
                  averagePnl: -65.67999999999999,
                  totalPnl: -328.4,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 5,
                },
                {
                  date: "2025-03-21",
                  averagePnl: -34.43,
                  totalPnl: -172.15,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 5,
                },
                {
                  date: "2025-04-22",
                  averagePnl: 17.65333333333333,
                  totalPnl: 264.79999999999995,
                  tradeCount: 9,
                  winCount: 3,
                  totalContracts: 15,
                },
                {
                  date: "2025-04-23",
                  averagePnl: 59.32000000000001,
                  totalPnl: 296.6,
                  tradeCount: 3,
                  winCount: 3,
                  totalContracts: 5,
                },
                {
                  date: "2025-04-24",
                  averagePnl: -3.1799999999999997,
                  totalPnl: -47.699999999999996,
                  tradeCount: 9,
                  winCount: 0,
                  totalContracts: 15,
                },
                {
                  date: "2025-04-29",
                  averagePnl: -34.42999999999999,
                  totalPnl: -344.29999999999995,
                  tradeCount: 6,
                  winCount: 0,
                  totalContracts: 10,
                },
                {
                  date: "2025-05-08",
                  averagePnl: 59.32000000000001,
                  totalPnl: 296.6,
                  tradeCount: 3,
                  winCount: 3,
                  totalContracts: 5,
                },
                {
                  date: "2025-05-15",
                  averagePnl: 59.32000000000001,
                  totalPnl: 296.6,
                  tradeCount: 3,
                  winCount: 3,
                  totalContracts: 5,
                },
                {
                  date: "2025-05-19",
                  averagePnl: -34.43,
                  totalPnl: -172.15,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 5,
                },
                {
                  date: "2025-05-22",
                  averagePnl: 28.07,
                  totalPnl: 280.7,
                  tradeCount: 6,
                  winCount: 3,
                  totalContracts: 10,
                },
                {
                  date: "2025-06-03",
                  averagePnl: -34.43,
                  totalPnl: -344.3,
                  tradeCount: 6,
                  winCount: 0,
                  totalContracts: 10,
                },
                {
                  date: "2025-06-04",
                  averagePnl: -3.1799999999999997,
                  totalPnl: -15.899999999999999,
                  tradeCount: 3,
                  winCount: 0,
                  totalContracts: 5,
                },
              ];
              const maxP = Math.max(
                ...loadingMockData.map((d) => d.averagePnl),
              );
              const minP = Math.min(
                ...loadingMockData.map((d) => d.averagePnl),
              );
              const domainMin = Math.min(minP * 1.1, 0);
              const domainMax = Math.max(maxP * 1.1, 0);
              const margin =
                size === "small"
                  ? { left: 10, right: 4, top: 4, bottom: 20 }
                  : { left: 10, right: 8, top: 8, bottom: 24 };
              const yAxisWidth = 60;
              const xAxisHeight = size === "small" ? 20 : 24;
              return (
                <div className={cn("w-full h-full animate-pulse relative")}>
                  {/* Axis tick skeletons */}
                  <div
                    className="pointer-events-none absolute flex flex-col justify-between pr-2"
                    style={{
                      left: `${margin.left}px`,
                      top: `${margin.top}px`,
                      bottom: `${margin.bottom + xAxisHeight}px`,
                      width: `${yAxisWidth}px`,
                    }}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-3 w-10" />
                    ))}
                  </div>
                  <div
                    className="pointer-events-none absolute flex items-center justify-between"
                    style={{
                      left: `${margin.left + yAxisWidth}px`,
                      right: `${margin.right}px`,
                      bottom: `${margin.bottom}px`,
                      height: `${xAxisHeight}px`,
                    }}
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className={cn(
                          size === "small" ? "h-3 w-8" : "h-3.5 w-10",
                        )}
                      />
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loadingMockData} margin={margin}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="text-border dark:opacity-[0.12] opacity-[0.2]"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        height={size === "small" ? 20 : 24}
                        tick={false}
                        minTickGap={size === "small" ? 30 : 50}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={60}
                        tickMargin={4}
                        tick={false}
                        domain={[domainMin, domainMax]}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" />
                      <Bar
                        dataKey="averagePnl"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={size === "small" ? 25 : 40}
                        className="transition-none"
                        fill="hsl(var(--muted-foreground) / 0.35)"
                      >
                        {loadingMockData.map((_, index) => (
                          <Cell
                            key={`skeleton-cell-${index}`}
                            fill="hsl(var(--muted-foreground) / 0.35)"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={
                  size === "small"
                    ? { left: 10, right: 4, top: 4, bottom: 20 }
                    : { left: 10, right: 8, top: 8, bottom: 24 }
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="text-border dark:opacity-[0.12] opacity-[0.2]"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  height={size === "small" ? 20 : 24}
                  tickMargin={size === "small" ? 4 : 8}
                  tick={{
                    fontSize: size === "small" ? 9 : 11,
                    fill: "currentColor",
                  }}
                  minTickGap={size === "small" ? 30 : 50}
                  tickFormatter={(value) => {
                    const date = new Date(value);
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
                  tick={{
                    fontSize: size === "small" ? 9 : 11,
                    fill: "currentColor",
                  }}
                  tickFormatter={formatCurrency}
                  domain={[
                    Math.min(minPnL * 1.1, 0),
                    Math.max(maxPnL * 1.1, 0),
                  ]}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{
                    fontSize: size === "small" ? "10px" : "12px",
                    zIndex: 1000,
                  }}
                />
                <Bar
                  dataKey="averagePnl"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={size === "small" ? 25 : 40}
                  className="transition-all duration-300 ease-in-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColor(entry.averagePnl)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {config.selectedInstrument
                ? t("pnlPerContractDaily.noData")
                : t("pnlPerContractDaily.selectInstrument")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
