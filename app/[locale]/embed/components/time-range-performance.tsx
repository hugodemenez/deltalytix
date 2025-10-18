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
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { ChartConfig } from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { themeVarsToStyle, type EmbedThemeVars } from "../theme";
import { useI18n } from "@/locales/client";

function getTimeRangeKey(timeInPosition: number): string {
  const minutes = timeInPosition / 60; // Convert seconds to minutes
  if (minutes < 1) return "under1min";
  if (minutes >= 1 && minutes < 5) return "1to5min";
  if (minutes >= 5 && minutes < 10) return "5to10min";
  if (minutes >= 10 && minutes < 15) return "10to15min";
  if (minutes >= 15 && minutes < 30) return "15to30min";
  if (minutes >= 30 && minutes < 60) return "30to60min";
  if (minutes >= 60 && minutes < 120) return "1to2hours";
  if (minutes >= 120 && minutes < 300) return "2to5hours";
  return "over5hours";
}

function getColorByWinRate(winRate: number): string {
  if (winRate === 0) return "hsl(var(--muted-foreground))";
  // Use chart palette variables so presets/overrides affect this chart
  return winRate >= 50 ? "hsl(var(--chart-win))" : "hsl(var(--chart-loss))";
}

const chartConfig = {
  avgPnl: {
    label: "Average PnL",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function TimeRangePerformanceChart({
  trades,
  theme,
}: {
  trades: { pnl: number; timeInPosition: number; commission?: number }[];
  theme?: EmbedThemeVars;
}) {
  const t = useI18n();
  const [activeRange, setActiveRange] = React.useState<string | null>(null);

  const getTimeRangeLabel = React.useCallback(
    (range: string): string => {
      // Map range keys to their translations
      const rangeLabels: Record<string, string> = {
        under1min: t("embed.timeRangePerformance.ranges.under1min"),
        "1to5min": t("embed.timeRangePerformance.ranges.1to5min"),
        "5to10min": t("embed.timeRangePerformance.ranges.5to10min"),
        "10to15min": t("embed.timeRangePerformance.ranges.10to15min"),
        "15to30min": t("embed.timeRangePerformance.ranges.15to30min"),
        "30to60min": t("embed.timeRangePerformance.ranges.30to60min"),
        "1to2hours": t("embed.timeRangePerformance.ranges.1to2hours"),
        "2to5hours": t("embed.timeRangePerformance.ranges.2to5hours"),
        over5hours: t("embed.timeRangePerformance.ranges.over5hours"),
      };
      return rangeLabels[range] || range;
    },
    [t],
  );

  const chartData = React.useMemo(() => {
    const timeRangeData: Record<
      string,
      {
        totalPnl: number;
        winCount: number;
        lossCount: number;
        totalTrades: number;
      }
    > = {
      under1min: { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      "1to5min": { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      "5to10min": { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      "10to15min": { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      "15to30min": { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      "30to60min": { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      "1to2hours": { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      "2to5hours": { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      over5hours: { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
    };

    trades.forEach((trade) => {
      const timeRange = getTimeRangeKey(trade.timeInPosition);
      timeRangeData[timeRange].totalPnl += trade.pnl - (trade.commission || 0);
      timeRangeData[timeRange].totalTrades++;
      if (trade.pnl - (trade.commission || 0) > 0) {
        timeRangeData[timeRange].winCount++;
      } else {
        timeRangeData[timeRange].lossCount++;
      }
    });

    return Object.entries(timeRangeData).map(([range, data]) => {
      const winRate =
        data.totalTrades > 0 ? (data.winCount / data.totalTrades) * 100 : 0;
      return {
        range,
        avgPnl: data.totalTrades > 0 ? data.totalPnl / data.totalTrades : 0,
        winRate,
        trades: data.totalTrades,
        color: getColorByWinRate(winRate),
      };
    });
  }, [trades]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length) {
        setActiveRange(payload[0].payload.range);
      } else {
        setActiveRange(null);
      }
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
                {t("embed.timeRangePerformance.tooltip.timeRange")}
              </span>
              <span className="font-bold text-muted-foreground">
                {getTimeRangeLabel(label)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.timeRangePerformance.tooltip.avgPnl")}
              </span>
              <span className="font-bold">${data.avgPnl.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.timeRangePerformance.tooltip.winRate")}
              </span>
              <span className="font-bold" style={{ color: data.color }}>
                {data.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.timeRangePerformance.tooltip.trades", {
                  count: data.trades,
                })}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.trades}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-[500px] flex flex-col" style={themeVarsToStyle(theme)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">
              {t("embed.timeRangePerformance.title")}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t("embed.timeRangePerformance.description")}</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ left: 0, right: 8, top: 8, bottom: 24 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="range"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={(props) => {
                  const { x, y, payload } = props;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={4}
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize={11}
                        transform="rotate(0)"
                      >
                        {getTimeRangeLabel(payload.value)}
                      </text>
                    </g>
                  );
                }}
                interval="preserveStartEnd"
                allowDataOverflow={true}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={45}
                tickMargin={4}
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                }}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{
                  fontSize: "12px",
                  zIndex: 1000,
                }}
              />
              <Bar
                dataKey="avgPnl"
                fill={chartConfig.avgPnl.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
                className="transition-all duration-300 ease-in-out"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.range}`}
                    fill={entry.color}
                    className="transition-all duration-300 ease-in-out"
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
