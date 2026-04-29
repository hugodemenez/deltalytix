"use client";

import * as React from "react";
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormattedTrade } from "./compute-metrics";
import { getWinRateByInstrument } from "./compute-metrics";

const fmt = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function WinRateByInstrument({ trades }: { trades: FormattedTrade[] }) {
  const data = React.useMemo(() => getWinRateByInstrument(trades), [trades]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-xs text-xs">
        <p className="font-semibold">{d.instrument}</p>
        <p>Win Rate: <span className="font-bold">{d.winRate.toFixed(1)}%</span></p>
        <p>Trades: {d.total}</p>
        <p>P&L: {fmt(d.pnl)}</p>
      </div>
    );
  };

  return (
    <Card className="h-72 md:col-span-2 xl:col-span-1">
      <CardHeader className="p-4 pb-2 border-b h-14">
        <CardTitle className="text-base">Win Rate by Instrument</CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-3.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="instrument"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <ReferenceLine x={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="winRate" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.winRate >= 50
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
