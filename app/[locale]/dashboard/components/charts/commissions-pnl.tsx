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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "@/components/ui/chart";
import { useData } from "@/context/data-provider";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";

interface CommissionsPnLChartProps {
  size?: WidgetSize;
}


const chartConfig = {
  pnl: {
    label: "Net P/L",
    color: "hsl(var(--chart-win))",
  },
  commissions: {
    label: "Commissions",
    color: "hsl(var(--chart-loss))",
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CommissionsPnLChart({
  size = "medium",
}: CommissionsPnLChartProps) {
  const { formattedTrades: trades } = useData();
  const t = useI18n();


  const chartData = React.useMemo(() => {
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalCommissions = trades.reduce(
      (sum, trade) => sum + trade.commission,
      0,
    );
    const total = Math.abs(totalPnL) + Math.abs(totalCommissions);
    const pnlPercent = total > 0 ? Number(((Math.abs(totalPnL) / total) * 100).toFixed(2)) : 0;
    const commPercent = total > 0 ? Number(((Math.abs(totalCommissions) / total) * 100).toFixed(2)) : 0;
    return [
      {
        name: t("commissions.legend.netPnl"),
        value: pnlPercent,
        color: chartConfig.pnl.color,
        raw: totalPnL,
      },
      {
        name: t("commissions.legend.commissions"),
        value: commPercent,
        color: chartConfig.commissions.color,
        raw: totalCommissions,
      },
    ];
  }, [trades, t]);


  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: any }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-xs">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("commissions.tooltip.type")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("commissions.tooltip.amount")}
              </span>
              <span className="font-bold">{formatCurrency(data.raw)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("commissions.tooltip.percentage")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.value.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };


  const renderColorfulLegendText = (value: string, entry: any) => {
    return <span className="text-xs text-muted-foreground">{value}</span>;
  };


  // Pie radii for consistency with trade-distribution
  const getInnerRadius = () => (size === 'small' ? '60%' : '65%');
  const getOuterRadius = () => (size === 'small' ? '80%' : '85%');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small' ? "p-2 h-10" : "p-3 sm:p-4 h-14"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle
              className={cn(
                "line-clamp-1",
                size === 'small' ? "text-sm" : "text-base"
              )}
            >
              {t("commissions.title")}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t("commissions.tooltip.description")}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex-1 min-h-0",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={getInnerRadius()}
                outerRadius={getOuterRadius()}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={-270}
                stroke="hsl(var(--background))"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-all duration-300 ease-in-out hover:opacity-80 dark:brightness-90"
                  />
                ))}
                {/* Centered percentage labels */}
                <Label
                  position="center"
                  content={(props: any) => {
                    if (!props.viewBox) return null;
                    const viewBox = props.viewBox;
                    if (!viewBox.cx || !viewBox.cy) return null;
                    const cx = viewBox.cx;
                    const cy = viewBox.cy;
                    const labelRadius = Math.min(cx, cy) * (size === 'small' ? 0.95 : 1.1);
                    return chartData.map((entry, index) => {
                      const angle = -90 + (360 * (entry.value / 100) / 2) + (360 * chartData.slice(0, index).reduce((acc, curr) => acc + curr.value, 0) / 100);
                      const x = cx + labelRadius * Math.cos((angle * Math.PI) / 180);
                      const y = cy + labelRadius * Math.sin((angle * Math.PI) / 180);
                      return (
                        <text
                          key={index}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-muted-foreground font-medium translate-y-2"
                          style={{ fontSize: size === 'small' ? '10px' : '12px' }}
                        >
                          {entry.value > 5 ? `${Math.round(entry.value)}%` : ''}
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
                formatter={renderColorfulLegendText}
                wrapperStyle={{
                  paddingTop: size === 'small' ? 0 : 16
                }}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{
                  fontSize: size === 'small' ? '10px' : '12px',
                  zIndex: 1000
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
