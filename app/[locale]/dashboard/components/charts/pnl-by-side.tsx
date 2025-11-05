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
import { Switch } from "@/components/ui/switch";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";

interface PnLBySideChartProps {
  size?: WidgetSize;
}

const chartConfig = {
  pnl: {
    label: "P/L",
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
              {t("pnlBySide.tooltip.side")}
            </span>
            <span className="font-bold text-muted-foreground">{data.side}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {data.isAverage ? t("pnlBySide.tooltip.averageTotal") : "Total"}{" "}
              P/L
            </span>
            <span className="font-bold">{formatCurrency(data.pnl)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlBySide.tooltip.winRate")}
            </span>
            <span className="font-bold text-muted-foreground">
              {((data.winCount / data.tradeCount) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlBySide.tooltip.trades")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} {t("pnlBySide.tooltip.trades")} ({data.winCount}{" "}
              {data.winCount === 1
                ? t("pnlBySide.tooltip.wins")
                : t("pnlBySide.tooltip.wins_plural")}
              )
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PnLBySideChart({
  size = "medium",
}: PnLBySideChartProps) {
  const { formattedTrades: trades } = useData();
  const [showAverage, setShowAverage] = React.useState(true);
  const t = useI18n();

  const chartData = React.useMemo(() => {
    const longTrades = trades.filter(
      (trade) => trade.side?.toLowerCase() === "long",
    );
    const shortTrades = trades.filter(
      (trade) => trade.side?.toLowerCase() === "short",
    );

    const longPnL = longTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const shortPnL = shortTrades.reduce((sum, trade) => sum + trade.pnl, 0);

    const longWins = longTrades.filter((trade) => trade.pnl > 0).length;
    const shortWins = shortTrades.filter((trade) => trade.pnl > 0).length;

    return [
      {
        side: "Long",
        pnl: showAverage
          ? longTrades.length > 0
            ? longPnL / longTrades.length
            : 0
          : longPnL,
        tradeCount: longTrades.length,
        winCount: longWins,
        isAverage: showAverage,
      },
      {
        side: "Short",
        pnl: showAverage
          ? shortTrades.length > 0
            ? shortPnL / shortTrades.length
            : 0
          : shortPnL,
        tradeCount: shortTrades.length,
        winCount: shortWins,
        isAverage: showAverage,
      },
    ];
  }, [trades, showAverage]);

  const maxPnL = Math.max(...chartData.map((d) => d.pnl));
  const minPnL = Math.min(...chartData.map((d) => d.pnl));
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
              {t("pnlBySide.title")}
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
                  <p>{t("pnlBySide.description")}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-muted-foreground",
                size === "small" ? "text-xs" : "text-sm",
              )}
            >
              {t("pnlBySide.toggle.showAverage")}
            </span>
            <Switch
              checked={showAverage}
              onCheckedChange={setShowAverage}
              className="data-[state=checked]:bg-primary"
            />
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
                dataKey="side"
                tickLine={false}
                axisLine={false}
                height={size === "small" ? 20 : 24}
                tickMargin={size === "small" ? 4 : 8}
                tick={{
                  fontSize: size === "small" ? 9 : 11,
                  fill: "currentColor",
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
                dataKey="pnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={size === "small" ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.pnl)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
