"use client";

import * as React from "react";
import { useData } from "@/context/data-provider";
import { useI18n } from "@/locales/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { PerformanceKpiRow } from "./performance-kpi-row";
import { WinRateByTime } from "./win-rate-by-time";
import { WinRateByInstrument } from "./win-rate-by-instrument";
import { WinRateByWeekday } from "./win-rate-by-weekday";
import { MaeMfeChart } from "./mae-mfe-chart";
import { DrawdownChart } from "./drawdown-chart";
import { PeriodComparison } from "./period-comparison";
import { exportPerformanceCsv } from "./export-csv";
import { computePerformanceMetrics } from "./compute-metrics";

export function PerformanceCenterPage() {
  const { formattedTrades, calendarData } = useData();
  const t = useI18n();

  const metrics = React.useMemo(
    () => computePerformanceMetrics(formattedTrades ?? []),
    [formattedTrades]
  );

  const handleExport = React.useCallback(() => {
    exportPerformanceCsv(formattedTrades ?? [], metrics);
  }, [formattedTrades, metrics]);

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
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <DownloadIcon className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

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
          <WinRateByTime trades={formattedTrades ?? []} />
          <WinRateByWeekday trades={formattedTrades ?? []} />
          <WinRateByInstrument trades={formattedTrades ?? []} />
        </TabsContent>

        <TabsContent value="maemfe">
          <MaeMfeChart trades={formattedTrades ?? []} />
        </TabsContent>

        <TabsContent value="drawdown">
          <DrawdownChart trades={formattedTrades ?? []} />
        </TabsContent>

        <TabsContent value="comparison">
          <PeriodComparison trades={formattedTrades ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
