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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/locales/client";

const days = [0, 1, 2, 3, 4, 5, 6]; // Sunday=0

export default function WeekdayPnLChartEmbed({
  trades,
}: {
  trades: { pnl: number; entryDate?: string | Date; commission?: number }[];
}) {
  const t = useI18n();
  const [activeDay, setActiveDay] = React.useState<number | null>(null);

  const dayAbbreviations = React.useMemo(
    () => [
      t("embed.calendar.weekdays.sun"),
      t("embed.calendar.weekdays.mon"),
      t("embed.calendar.weekdays.tue"),
      t("embed.calendar.weekdays.wed"),
      t("embed.calendar.weekdays.thu"),
      t("embed.calendar.weekdays.fri"),
      t("embed.calendar.weekdays.sat"),
    ],
    [t],
  );

  const weekdayData = React.useMemo(() => {
    const totals: Record<number, { total: number; count: number }> =
      Object.fromEntries(days.map((d) => [d, { total: 0, count: 0 }])) as any;
    trades.forEach((t) => {
      if (!t.entryDate) return;
      const d =
        typeof t.entryDate === "string" ? new Date(t.entryDate) : t.entryDate;
      if (Number.isNaN(d.getTime())) return;
      const dow = d.getUTCDay();
      totals[dow].total += t.pnl - (t.commission || 0);
      totals[dow].count += 1;
    });
    return days.map((day) => ({
      day,
      pnl: totals[day].count ? totals[day].total / totals[day].count : 0,
      tradeCount: totals[day].count,
    }));
  }, [trades]);

  const maxPnL = React.useMemo(
    () => Math.max(...weekdayData.map((d) => d.pnl), 0),
    [weekdayData],
  );
  const minPnL = React.useMemo(
    () => Math.min(...weekdayData.map((d) => d.pnl), 0),
    [weekdayData],
  );
  const getColor = (value: number) => {
    const range = maxPnL - minPnL || 1;
    const ratio = Math.abs((value - minPnL) / range);
    const base = value >= 0 ? "--chart-win" : "--chart-loss";
    const intensity = Math.max(0.2, ratio);
    return `hsl(var(${base}) / ${intensity})`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length)
        setActiveDay(payload[0].payload.day);
      else setActiveDay(null);
    }, [active, payload]);

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
                {t("embed.weekdayPnl.tooltip.day")}
              </span>
              <span className="font-bold text-muted-foreground">
                {dayAbbreviations[label]}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.weekdayPnl.tooltip.averagePnl")}
              </span>
              <span className="font-bold">${data.pnl.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.weekdayPnl.tooltip.trades")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.tradeCount}
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
              {t("embed.weekdayPnl.title")}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t("embed.weekdayPnl.description")}</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weekdayData}
              margin={{ left: 0, right: 8, top: 8, bottom: 24 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickFormatter={(v) => dayAbbreviations[v]}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={50}
                tickMargin={4}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
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
                {weekdayData.map((entry) => (
                  <Cell
                    key={`cell-${entry.day}`}
                    fill={getColor(entry.pnl)}
                    opacity={
                      activeDay === entry.day ? 1 : activeDay === null ? 1 : 0.3
                    }
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
