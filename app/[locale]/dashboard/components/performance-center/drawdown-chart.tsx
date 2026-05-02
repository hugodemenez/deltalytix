"use client";

import * as React from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormattedTrade } from "./compute-metrics";
import { getDrawdownCurve } from "./compute-metrics";
import { format, parseISO } from "date-fns";

export function DrawdownChart({ trades }: { trades: FormattedTrade[] }) {
  const data = React.useMemo(() => getDrawdownCurve(trades), [trades]);

  const minDD = data.length ? Math.min(...data.map(d => d.drawdown)) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-xs text-xs">
        <p className="font-semibold">{format(parseISO(d.date), "MMM d, yyyy")}</p>
        <p>Drawdown: <span className="text-red-500 font-bold">{d.drawdown.toFixed(2)}%</span></p>
        <p>Equity: ${d.equity.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
      </div>
    );
  };

  return (
    <Card className="h-96">
      <CardHeader className="p-4 pb-2 border-b h-14">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Drawdown Curve</CardTitle>
          {minDD < 0 && (
            <span className="text-xs text-red-500 font-medium">
              Max: {minDD.toFixed(2)}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-3.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 24 }}>
            <defs>
              <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-loss))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-loss))" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => format(parseISO(v), "MMM d")}
            />
            <YAxis
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              width={40}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="hsl(var(--chart-loss))"
              strokeWidth={1.5}
              fill="url(#ddGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
