"use client";

import * as React from "react";
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FormattedTrade } from "./compute-metrics";
import { getPeriodStats } from "./compute-metrics";
import { cn } from "@/lib/utils";

type Period = "week" | "month";

const fmt = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function PeriodComparison({ trades }: { trades: FormattedTrade[] }) {
  const [period, setPeriod] = React.useState<Period>("month");

  const data = React.useMemo(() => getPeriodStats(trades, period), [trades, period]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-xs text-xs">
        <p className="font-semibold">{d.label}</p>
        <p>P&L: <span className={cn("font-bold", d.pnl >= 0 ? "text-emerald-600" : "text-red-500")}>{fmt(d.pnl)}</span></p>
        <p>Trades: {d.trades}</p>
        <p>Win Rate: {d.winRate.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <Card className="h-96">
      <CardHeader className="p-4 pb-2 border-b h-14">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Period Comparison</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={period === "week" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriod("week")}
            >
              Weekly
            </Button>
            <Button
              variant={period === "month" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriod("month")}
            >
              Monthly
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-3.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmt(v)}
              width={52}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.pnl >= 0
                    ? "hsl(var(--chart-win))"
                    : "hsl(var(--chart-loss))"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
