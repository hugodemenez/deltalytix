"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/locales/client";

export default function CommissionsPnLEmbed({
  trades,
}: {
  trades: { pnl: number; commission: number }[];
}) {
  const t = useI18n();
  const chartData = React.useMemo(() => {
    const totalPnL = trades.reduce(
      (s, t) => s + ((t.pnl || 0) - (t.commission || 0)),
      0,
    );
    const totalCommissions = trades.reduce(
      (s, t) => s + (t.commission || 0),
      0,
    );
    const total = Math.abs(totalPnL) + Math.abs(totalCommissions) || 1;
    return [
      {
        name: t("embed.commissions.legend.netPnl"),
        value: totalPnL,
        percentage: totalPnL / total,
        fill:
          totalPnL >= 0 ? "hsl(var(--chart-win))" : "hsl(var(--chart-loss))",
      },
      {
        name: t("embed.commissions.legend.commissions"),
        value: totalCommissions,
        percentage: totalCommissions / total,
        fill: "hsl(var(--chart-4))",
      },
    ];
  }, [trades, t]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("en-US", { style: "currency", currency: "USD" });

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
                {data.name || item?.name}
              </span>
              <span className="font-bold">
                {formatCurrency(Number(data.value ?? item?.value ?? 0))}
              </span>
            </div>
            {typeof data.percentage === "number" && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                  {t("embed.commissions.tooltip.percentage")}
                </span>
                <span className="font-bold text-muted-foreground">
                  {(Math.abs(data.percentage) * 100).toFixed(1)}%
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">
              {t("embed.commissions.title")}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t("embed.commissions.tooltip.description")}</p>
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
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={70 * 0.6}
                outerRadius={70}
                paddingAngle={2}
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.fill}
                    className="transition-all duration-300 ease-in-out"
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ fontSize: "12px", zIndex: 1000 }}
              />
              <Legend verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
