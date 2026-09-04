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
import { useData } from "@/context/data-provider";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { DonutChartLoadingSkeleton } from "./chart-loading-skeleton";
import { shareConclusion } from "./chart-conclusions";
import {
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  chartTooltipFontSize,
} from "./chart-glance";
import { ChartWidgetFrame } from "./chart-widget-frame";

interface CommissionsPnLChartProps {
  size?: WidgetSize;
}

const PNL_COLOR = "hsl(var(--chart-win))";
const COMMISSIONS_COLOR = "hsl(var(--chart-loss))";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CommissionsPnLChart({
  size = "medium",
}: CommissionsPnLChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();

  const { chartData, conclusion } = React.useMemo(() => {
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalCommissions = trades.reduce(
      (sum, trade) => sum + trade.commission,
      0,
    );
    const total = Math.abs(totalPnL) + Math.abs(totalCommissions);
    const pnlPercent = total > 0 ? Number(((Math.abs(totalPnL) / total) * 100).toFixed(2)) : 0;
    const commPercent = total > 0 ? Number(((Math.abs(totalCommissions) / total) * 100).toFixed(2)) : 0;
    return {
      chartData: [
        {
          name: t("commissions.legend.netPnl"),
          value: pnlPercent,
          color: PNL_COLOR,
          raw: totalPnL,
        },
        {
          name: t("commissions.legend.commissions"),
          value: commPercent,
          color: COMMISSIONS_COLOR,
          raw: totalCommissions,
        },
      ],
      conclusion: shareConclusion(Math.abs(totalCommissions), total),
    };
  }, [trades, t]);

  const subtitle =
    conclusion.kind === "empty"
      ? t("commissions.subtitle.empty")
      : t("commissions.subtitle.share", { percent: conclusion.percent });

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: any }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={CHART_TOOLTIP_CLASS}>
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
    <ChartWidgetFrame
      size={size}
      title={t("commissions.title")}
      subtitle={subtitle}
      description={t("commissions.tooltip.description")}
    >
      {isLoading ? (
        <DonutChartLoadingSkeleton size={size} />
      ) : (
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
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  );
}
