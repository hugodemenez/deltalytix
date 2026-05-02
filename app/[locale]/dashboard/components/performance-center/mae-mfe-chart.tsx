"use client";

import * as React from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormattedTrade } from "./compute-metrics";

const fmt = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

function DotWin(props: any) {
  const { cx, cy } = props;
  return <circle cx={cx} cy={cy} r={4} fill="hsl(var(--chart-win))" fillOpacity={0.75} />;
}

function DotLoss(props: any) {
  const { cx, cy } = props;
  return <circle cx={cx} cy={cy} r={4} fill="hsl(var(--chart-loss))" fillOpacity={0.75} />;
}

export function MaeMfeChart({ trades }: { trades: FormattedTrade[] }) {
  const data = React.useMemo(() =>
    trades
      .filter(t => typeof t.mae === "number" && typeof t.mfe === "number")
      .map(t => ({
        mae: Math.abs(t.mae as number),
        mfe: t.mfe as number,
        pnl: t.pnl,
        instrument: t.instrument,
        win: t.pnl > 0,
      })),
    [trades]
  );

  const wins = data.filter(d => d.win);
  const losses = data.filter(d => !d.win);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-xs text-xs">
        <p className="font-semibold">{d.instrument}</p>
        <p>MAE: {fmt(d.mae)}</p>
        <p>MFE: {fmt(d.mfe)}</p>
        <p>P&amp;L: <span className={d.win ? "text-emerald-600" : "text-red-500"}>{fmt(d.pnl)}</span></p>
      </div>
    );
  };

  if (!data.length) {
    return (
      <Card className="h-80">
        <CardHeader className="p-4 pb-2 border-b h-14">
          <CardTitle className="text-base">MAE vs MFE</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100%-3.5rem)] text-muted-foreground text-sm">
          No MAE/MFE data available. Import trades with trade analytics to see this chart.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96">
      <CardHeader className="p-4 pb-2 border-b h-14">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">MAE vs MFE</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Win ({wins.length})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              Loss ({losses.length})
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-3.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis
              dataKey="mae"
              name="MAE"
              type="number"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              label={{ value: "MAE ($)", position: "insideBottom", offset: -12, fontSize: 10 }}
              tickFormatter={(v) => `$${v}`}
            />
            <YAxis
              dataKey="mfe"
              name="MFE"
              type="number"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Wins" data={wins} shape={<DotWin />} isAnimationActive={false} />
            <Scatter name="Losses" data={losses} shape={<DotLoss />} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
