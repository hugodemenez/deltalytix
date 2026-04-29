"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PerformanceMetrics } from "./compute-metrics";
import { TrendingUp, TrendingDown, Target, BarChart2, Zap, Shield } from "lucide-react";

const fmt = (v: number, decimals = 2) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtCurrency = (v: number) =>
  `$${fmt(Math.abs(v))}${v < 0 ? " loss" : ""}`;

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
  icon: React.ReactNode;
}

function KpiCard({ label, value, sub, positive, icon }: KpiCardProps) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <span
          className={cn(
            "text-xl font-bold tabular-nums",
            positive === true && "text-emerald-600 dark:text-emerald-400",
            positive === false && "text-red-500 dark:text-red-400"
          )}
        >
          {value}
        </span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}

export function PerformanceKpiRow({ metrics }: { metrics: PerformanceMetrics }) {
  const kpis: KpiCardProps[] = [
    {
      label: "Net P&L",
      value: `$${fmt(metrics.netPnl)}`,
      sub: `Gross $${fmt(metrics.totalPnl)} · Comm $${fmt(metrics.totalCommissions)}`,
      positive: metrics.netPnl >= 0 ? true : false,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: "Win Rate",
      value: `${fmt(metrics.winRate, 1)}%`,
      sub: `${metrics.totalTrades} trades`,
      positive: metrics.winRate >= 50 ? true : false,
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: "Profit Factor",
      value: isFinite(metrics.profitFactor) ? fmt(metrics.profitFactor) : "∞",
      sub: `Avg win $${fmt(metrics.avgWin)} · Avg loss $${fmt(metrics.avgLoss)}`,
      positive: metrics.profitFactor >= 1 ? true : false,
      icon: <BarChart2 className="h-4 w-4" />,
    },
    {
      label: "Expectancy",
      value: `$${fmt(metrics.expectancy)}`,
      sub: "per trade",
      positive: metrics.expectancy >= 0 ? true : false,
      icon: <Zap className="h-4 w-4" />,
    },
    {
      label: "Max Drawdown",
      value: `$${fmt(metrics.maxDrawdown)}`,
      sub: `${fmt(metrics.maxDrawdownPct, 1)}% of peak equity`,
      positive: false,
      icon: <TrendingDown className="h-4 w-4" />,
    },
    {
      label: "Sharpe Ratio",
      value: fmt(metrics.sharpeRatio),
      sub: "annualised (daily)",
      positive: metrics.sharpeRatio >= 1 ? true : metrics.sharpeRatio >= 0 ? null : false,
      icon: <Shield className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
