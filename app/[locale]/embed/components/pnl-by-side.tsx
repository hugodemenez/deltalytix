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
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/locales/client";

type TradeLike = {
  side?: string;
  pnl: number;
  commission?: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function PnLBySideChartEmbed({
  trades,
}: {
  trades: TradeLike[];
}) {
  const t = useI18n();
  const [showAverage, setShowAverage] = React.useState(true);

  const chartData = React.useMemo(() => {
    const longTrades = trades.filter((t) => t.side?.toLowerCase() === "long");
    const shortTrades = trades.filter((t) => t.side?.toLowerCase() === "short");

    const longPnL = longTrades.reduce(
      (sum, t) => sum + (t.pnl - (t.commission || 0)),
      0,
    );
    const shortPnL = shortTrades.reduce(
      (sum, t) => sum + (t.pnl - (t.commission || 0)),
      0,
    );

    const longWins = longTrades.filter(
      (t) => t.pnl - (t.commission || 0) > 0,
    ).length;
    const shortWins = shortTrades.filter(
      (t) => t.pnl - (t.commission || 0) > 0,
    ).length;

    return [
      {
        side: "Long",
        pnl: showAverage
          ? longTrades.length
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
          ? shortTrades.length
            ? shortPnL / shortTrades.length
            : 0
          : shortPnL,
        tradeCount: shortTrades.length,
        winCount: shortWins,
        isAverage: showAverage,
      },
    ];
  }, [trades, showAverage]);

  const maxPnL = React.useMemo(
    () => Math.max(...chartData.map((d) => d.pnl)),
    [chartData],
  );
  const minPnL = React.useMemo(
    () => Math.min(...chartData.map((d) => d.pnl)),
    [chartData],
  );
  const absMax = React.useMemo(
    () => Math.max(Math.abs(maxPnL), Math.abs(minPnL)),
    [maxPnL, minPnL],
  );

  const getColor = (value: number) => {
    const ratio = absMax === 0 ? 0.2 : Math.max(0.2, Math.abs(value / absMax));
    const base = value >= 0 ? "--chart-win" : "--chart-loss";
    return `hsl(var(${base}) / ${ratio})`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="rounded-lg border bg-background p-2 shadow-xs"
          style={{
            background: "hsl(var(--embed-tooltip-bg, var(--background)))",
            borderColor: "hsl(var(--embed-tooltip-border, var(--border)))",
            borderRadius: "var(--embed-tooltip-radius, 0.5rem)",
          }}
        >
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.pnlBySide.tooltip.averageTotal")}
              </span>
              <span className="font-bold">{formatCurrency(data.pnl)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.pnlBySide.tooltip.trades")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.tradeCount}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.pnlBySide.tooltip.winRate")}
              </span>
              <span className="font-bold text-muted-foreground">
                {((data.winCount / Math.max(1, data.tradeCount)) * 100).toFixed(
                  1,
                )}
                %
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">
              {t("embed.pnlBySide.title")}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t("embed.pnlBySide.description")}</p>
              </PopoverContent>
            </Popover>
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowAverage((v) => !v)}
          >
            {t("embed.pnlBySide.toggle.showAverage")}
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ left: 10, right: 8, top: 8, bottom: 24 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="side"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickMargin={4}
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickFormatter={formatCurrency}
                domain={[Math.min(minPnL * 1.1, 0), Math.max(maxPnL * 1.1, 0)]}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ fontSize: "12px", zIndex: 1000 }}
              />
              <Bar
                dataKey="pnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
                className="transition-all duration-300 ease-in-out"
              >
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={getColor(entry.pnl)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
