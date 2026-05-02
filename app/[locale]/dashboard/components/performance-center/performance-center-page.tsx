"use client";

import * as React from "react";
import { useData } from "@/context/data-provider";
import { useI18n } from "@/locales/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DownloadIcon, BarChart2 } from "lucide-react";
import { PerformanceKpiRow } from "./performance-kpi-row";
import { WinRateByTime } from "./win-rate-by-time";
import { WinRateByInstrument } from "./win-rate-by-instrument";
import { WinRateByWeekday } from "./win-rate-by-weekday";
import { MaeMfeChart } from "./mae-mfe-chart";
import { DrawdownChart } from "./drawdown-chart";
import { PeriodComparison } from "./period-comparison";
import { exportPerformanceCsv } from "./export-csv";
import { computePerformanceMetrics } from "./compute-metrics";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-muted p-4">
        <BarChart2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No trades yet</p>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          Import your trades to unlock Performance Center analytics.
        </p>
      </div>
    </div>
  );
}

export function PerformanceCenterPage() {
  const { formattedTrades } = useData();
  const t = useI18n();

  const trades = formattedTrades ?? [];

  const metrics = React.useMemo(
    () => computePerformanceMetrics(trades),
    [trades]
  );

  const handleExport = React.useCallback(() => {
    exportPerformanceCsv(trades, metrics);
  }, [trades, metrics]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Performance Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deep analytics — win rates, MAE/MFE, drawdown &amp; period comparison
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={trades.length === 0}
          className="gap-2"
        >
          <DownloadIcon className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {trades.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* KPI Summary Row */}
          <PerformanceKpiRow metrics={metrics} />

          {/* Tabs */}
          <Tabs defaultValue="winrate" className="flex-1">
            <TabsList className="mb-4">
              <TabsTrigger value="winrate">Win Rate</TabsTrigger>
              <TabsTrigger value="maemfe">MAE / MFE</TabsTrigger>
              <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
              <TabsTrigger value="comparison">Period Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="winrate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <WinRateByTime trades={trades} />
              <WinRateByWeekday trades={trades} />
              <WinRateByInstrument trades={trades} />
            </TabsContent>

            <TabsContent value="maemfe">
              <MaeMfeChart trades={trades} />
            </TabsContent>

            <TabsContent value="drawdown">
              <DrawdownChart trades={trades} />
            </TabsContent>

            <TabsContent value="comparison">
              <PeriodComparison trades={trades} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
