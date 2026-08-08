"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";

import { useData } from "@/context/data-provider";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";

import { DonutChartLoadingSkeleton } from "./chart-loading-skeleton";
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetFooter,
  WidgetHeader,
  WidgetTooltip,
  chartColors,
  formatCount,
  formatCurrency,
  formatPercent,
  isCompactSize,
  pnlTone,
  pnlToneClass,
  pnlToneFill,
  widgetType,
} from "../widgets";

interface CommissionsPnLChartProps {
  size?: WidgetSize;
}

interface CommissionsSlice {
  key: "pnl" | "commissions";
  name: string;
  /** Share of the combined gross magnitude, 0-100. */
  value: number;
  color: string;
  /** The signed amount the slice stands for, in USD. */
  raw: number;
  toneClassName?: string;
}

export default function CommissionsPnLChart({
  size = "medium",
}: CommissionsPnLChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();
  const locale = useCurrentLocale();
  const compact = isCompactSize(size);

  const chartData = React.useMemo<CommissionsSlice[]>(() => {
    const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const commissions = trades.reduce(
      (sum, trade) => sum + trade.commission,
      0,
    );
    // A donut encodes share of a whole, so the parts have to be non negative.
    // The whole here is the combined gross magnitude of both figures; the
    // signed amounts are stated verbatim under the plot so nothing is hidden.
    const total = Math.abs(pnl) + Math.abs(commissions);
    const pnlPercent = total > 0 ? (Math.abs(pnl) / total) * 100 : 0;
    const commPercent = total > 0 ? (Math.abs(commissions) / total) * 100 : 0;

    return [
      {
        key: "pnl",
        name: t("commissions.legend.netPnl"),
        value: pnlPercent,
        // The only figure here that carries a sign, so the only one that earns color.
        color: pnlToneFill(pnlTone(pnl)),
        raw: pnl,
        toneClassName: pnlToneClass(pnlTone(pnl)),
      },
      {
        key: "commissions",
        name: t("commissions.legend.commissions"),
        value: commPercent,
        // A cost magnitude, not a signed result: it stays monochrome.
        color: chartColors.neutral,
        raw: commissions,
      },
    ];
  }, [trades, t]);

  const hasData = trades.length > 0 && chartData.some((slice) => slice.value > 0);

  const innerRadius = compact ? "60%" : "65%";
  const outerRadius = compact ? "80%" : "85%";

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("commissions.title")}
        description={t("commissions.tooltip.description")}
      />
      <WidgetBody size={size} className="flex min-h-0 flex-col gap-4">
        {isLoading ? (
          <DonutChartLoadingSkeleton size={size} />
        ) : !hasData ? (
          <WidgetEmpty size={size} message={t("widgets.empty.noTrades")} />
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    startAngle={90}
                    endAngle={-270}
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                    {/* Direct labels on the arcs: two series never earn a legend. */}
                    <Label
                      position="center"
                      content={(props: any) => {
                        const viewBox = props?.viewBox;
                        if (!viewBox?.cx || !viewBox?.cy) return null;
                        const { cx, cy } = viewBox;
                        const labelRadius = Math.min(cx, cy) * (compact ? 0.95 : 1.1);
                        return (
                          <>
                            {chartData.map((entry, index) => {
                              if (entry.value <= 5) return null;
                              const precedingShare = chartData
                                .slice(0, index)
                                .reduce((acc, curr) => acc + curr.value, 0);
                              const angle =
                                -90 +
                                (360 * (entry.value / 100)) / 2 +
                                (360 * precedingShare) / 100;
                              const x =
                                cx + labelRadius * Math.cos((angle * Math.PI) / 180);
                              const y =
                                cy + labelRadius * Math.sin((angle * Math.PI) / 180);
                              return (
                                <text
                                  key={entry.key}
                                  x={x}
                                  y={y}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-muted-foreground tabular-nums"
                                  style={{ fontSize: compact ? 10 : 11 }}
                                >
                                  {formatPercent(entry.value, locale, {
                                    maximumFractionDigits: 0,
                                  })}
                                </text>
                              );
                            })}
                          </>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip
                    cursor={false}
                    isAnimationActive={false}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const slice = payload[0].payload as CommissionsSlice;
                      return (
                        <WidgetTooltip
                          title={slice.name}
                          rows={[
                            {
                              label: t("commissions.tooltip.amount"),
                              value: formatCurrency(slice.raw, locale),
                              toneClassName: slice.toneClassName,
                            },
                            {
                              label: t("commissions.tooltip.percentage"),
                              value: formatPercent(slice.value, locale),
                            },
                          ]}
                        />
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* The exact, auditable figures behind the shares. */}
            <div className="flex shrink-0 flex-col gap-1.5">
              {chartData.map((slice) => (
                <div
                  key={slice.key}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className={cn(widgetType.label, "truncate")}>
                      {slice.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      widgetType.value,
                      "shrink-0 text-right",
                      slice.toneClassName,
                    )}
                  >
                    {formatCurrency(slice.raw, locale)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </WidgetBody>
      <WidgetFooter size={size}>
        <span>USD</span>
        <span className="tabular-nums">
          {formatCount(trades.length)} {t("tickDistribution.tooltip.trades")}
        </span>
      </WidgetFooter>
    </WidgetCard>
  );
}
