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
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";

interface PnLPerContractChartProps {
  size?: WidgetSize;
}

const chartConfig = {
  pnl: {
    label: "Avg P/L per Contract",
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
              {t("pnlPerContract.tooltip.averagePnl")}
            </span>
            <span className="font-bold">{formatCurrency(data.averagePnl)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContract.tooltip.totalPnl")}
            </span>
            <span className="font-bold text-muted-foreground">
              {formatCurrency(data.totalPnl)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContract.tooltip.trades")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} {t("pnlPerContract.tooltip.trades")} (
              {((data.winCount / data.tradeCount) * 100).toFixed(1)}%{" "}
              {t("pnlPerContract.tooltip.winRate")})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContract.tooltip.totalContracts")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.totalContracts} {t("pnlPerContract.tooltip.contracts")}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PnLPerContractChart({
  size = "medium",
}: PnLPerContractChartProps) {
  const { formattedTrades: trades } = useData();
  const t = useI18n();

  const chartData = React.useMemo(() => {
    // Group trades by instrument
    const instrumentGroups = trades.reduce(
      (acc, trade) => {
        const instrument = trade.instrument || "Unknown";
        const netPnl = trade.pnl - (trade.commission || 0); // Calculate net PnL (gross PnL - commission)

        if (!acc[instrument]) {
          acc[instrument] = {
            trades: [],
            totalPnl: 0,
            totalContracts: 0,
            winCount: 0,
          };
        }
        acc[instrument].trades.push(trade);
        acc[instrument].totalPnl += netPnl;
        acc[instrument].totalContracts += trade.quantity;
        if (netPnl > 0) {
          acc[instrument].winCount++;
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

    // Convert to chart data format
    return Object.entries(instrumentGroups)
      .map(([instrument, data]) => ({
        instrument,
        averagePnl:
          data.totalContracts > 0 ? data.totalPnl / data.totalContracts : 0,
        totalPnl: data.totalPnl,
        tradeCount: data.trades.length,
        winCount: data.winCount,
        totalContracts: data.totalContracts,
      }))
      .sort((a, b) => b.averagePnl - a.averagePnl); // Sort by average PnL descending
  }, [trades]);

  const maxPnL = Math.max(...chartData.map((d) => d.averagePnl));
  const minPnL = Math.min(...chartData.map((d) => d.averagePnl));
  const absMax = Math.max(Math.abs(maxPnL), Math.abs(minPnL));

  const getColor = (value: number) => {
    const ratio = Math.abs(value / absMax);
    const baseColorVar = value >= 0 ? "--chart-win" : "--chart-4";
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
              {t("pnlPerContract.title")}
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
                  <p>{t("pnlPerContract.description")}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
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
                dataKey="instrument"
                tickLine={false}
                axisLine={false}
                height={size === "small" ? 20 : 24}
                tickMargin={size === "small" ? 4 : 8}
                tick={{
                  fontSize: size === "small" ? 9 : 11,
                  fill: "currentColor",
                }}
                angle={size === "small" ? -45 : -45}
                textAnchor="end"
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
                domain={[Math.min(minPnL * 1.1, 0), Math.max(maxPnL * 1.1, 0)]}
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
        </div>
      </CardContent>
    </Card>
  );
}
