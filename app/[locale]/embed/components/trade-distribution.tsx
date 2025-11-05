"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";
import type { Props } from "recharts/types/component/Label";
import type { PolarViewBox } from "recharts/types/util/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/locales/client";

export default function TradeDistributionChartEmbed({
  trades,
}: {
  trades: { pnl: number; commission?: number }[];
}) {
  const t = useI18n();

  const chartData = React.useMemo(() => {
    const nbTrades = trades.length;
    const nbWin = trades.filter((t) => t.pnl - (t.commission || 0) > 0).length;
    const nbLoss = trades.filter((t) => t.pnl - (t.commission || 0) < 0).length;
    const nbBe = trades.filter((t) => t.pnl - (t.commission || 0) === 0).length;
    const winRate = nbTrades ? (nbWin / nbTrades) * 100 : 0;
    const lossRate = nbTrades ? (nbLoss / nbTrades) * 100 : 0;
    const beRate = nbTrades ? (nbBe / nbTrades) * 100 : 0;

    return [
      {
        name: `Win (${nbWin}/${nbTrades})`,
        value: winRate,
        color: "hsl(var(--chart-win))",
        count: nbWin,
      },
      {
        name: `Breakeven (${nbBe}/${nbTrades})`,
        value: beRate,
        color: "hsl(var(--chart-5) / 0.6)",
        count: nbBe,
      },
      {
        name: `Loss (${nbLoss}/${nbTrades})`,
        value: lossRate,
        color: "hsl(var(--chart-loss))",
        count: nbLoss,
      },
    ];
  }, [trades]);

  const renderLegendText = (value: string) => (
    <span className="text-xs text-muted-foreground">{value}</span>
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const data = item?.payload || {};
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
            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.tradeDistribution.tooltip.type")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.name || item?.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("embed.tradeDistribution.tooltip.percentage")}
              </span>
              <span className="font-bold">{`${Number(item?.value ?? data.value ?? 0).toFixed(1)}%`}</span>
            </div>
            {typeof data.count === "number" && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  {t("embed.calendar.charts.trades")}
                </span>
                <span className="font-bold text-muted-foreground">
                  {data.count}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-14">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">
              {t("embed.tradeDistribution.title")}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t("embed.tradeDistribution.description")}</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius="65%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="hsl(var(--background))"
                strokeWidth={1}
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.color}
                    className="transition-all duration-300 ease-in-out hover:opacity-80 dark:brightness-90"
                  />
                ))}
                <Label
                  position="center"
                  content={(props: Props) => {
                    if (!props.viewBox) return null;
                    const viewBox = props.viewBox as PolarViewBox;
                    if (!viewBox.cx || !viewBox.cy) return null;
                    const { cx, cy } = viewBox;
                    const labelRadius = Math.min(cx, cy) * 1.1;
                    return chartData.map((entry, index) => {
                      const cum = chartData
                        .slice(0, index)
                        .reduce((a, c) => a + c.value, 0);
                      const angle =
                        -90 +
                        (360 * (entry.value / 100)) / 2 +
                        (360 * cum) / 100;
                      const x =
                        cx + labelRadius * Math.cos((angle * Math.PI) / 180);
                      const y =
                        cy + labelRadius * Math.sin((angle * Math.PI) / 180);
                      return (
                        <text
                          key={index}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-muted-foreground font-medium translate-y-2"
                          style={{ fontSize: "12px" }}
                        >
                          {entry.value > 5 ? `${Math.round(entry.value)}%` : ""}
                        </text>
                      );
                    });
                  }}
                />
              </Pie>
              <Legend
                verticalAlign="bottom"
                align="center"
                iconSize={8}
                iconType="circle"
                formatter={renderLegendText}
                wrapperStyle={{ paddingTop: 16 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ fontSize: "12px", zIndex: 1000 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
