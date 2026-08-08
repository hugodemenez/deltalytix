"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

import { useData } from "@/context/data-provider";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";

import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_AVERAGE_PNL,
} from "./chart-loading-skeleton";
import {
  WidgetBody,
  WidgetCard,
  WidgetChartGrid,
  WidgetEmpty,
  WidgetFooter,
  WidgetHeader,
  WidgetTooltip,
  WidgetZeroLine,
  axisProps,
  chartMargin,
  formatCompactCurrency,
  formatCount,
  formatCurrency,
  formatPercent,
  isCompactSize,
  pnlTone,
  pnlToneClass,
  pnlToneFill,
} from "../widgets";

interface PnLPerContractChartProps {
  size?: WidgetSize;
}

interface InstrumentRow {
  instrument: string;
  averagePnl: number;
  totalPnl: number;
  tradeCount: number;
  winCount: number;
  totalContracts: number;
}

export default function PnLPerContractChart({
  size = "medium",
}: PnLPerContractChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();
  const locale = useCurrentLocale();
  const compact = isCompactSize(size);

  const chartData = React.useMemo<InstrumentRow[]>(() => {
    // Group trades by instrument
    const instrumentGroups = trades.reduce(
      (acc, trade) => {
        const instrument = trade.instrument || "Unknown";
        const netPnl = trade.pnl - (trade.commission || 0); // Calculate net PnL (gross PnL - commission)

        if (!acc[instrument]) {
          acc[instrument] = {
            trades: [],
            totalPnl: 0,
            totalContracts: 0,
            winCount: 0,
          };
        }
        acc[instrument].trades.push(trade);
        acc[instrument].totalPnl += netPnl;
        acc[instrument].totalContracts += trade.quantity;
        if (netPnl > 0) {
          acc[instrument].winCount++;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          trades: any[];
          totalPnl: number;
          totalContracts: number;
          winCount: number;
        }
      >,
    );

    // Convert to chart data format
    return Object.entries(instrumentGroups)
      .map(([instrument, data]) => ({
        instrument,
        averagePnl:
          data.totalContracts > 0 ? data.totalPnl / data.totalContracts : 0,
        totalPnl: data.totalPnl,
        tradeCount: data.trades.length,
        winCount: data.winCount,
        totalContracts: data.totalContracts,
      }))
      .sort((a, b) => b.averagePnl - a.averagePnl); // Sort by average PnL descending
  }, [trades]);

  const totals = React.useMemo(
    () =>
      chartData.reduce(
        (acc, row) => ({
          trades: acc.trades + row.tradeCount,
          contracts: acc.contracts + row.totalContracts,
        }),
        { trades: 0, contracts: 0 },
      ),
    [chartData],
  );

  // Bar length is a magnitude encoding, so the domain always contains zero.
  // The 10% headroom only ever extends away from the baseline.
  const yDomain = React.useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 0];
    const values = chartData.map((row) => row.averagePnl);
    return [
      Math.min(Math.min(...values) * 1.1, 0),
      Math.max(Math.max(...values) * 1.1, 0),
    ];
  }, [chartData]);

  const hasData = chartData.length > 0;

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("pnlPerContract.title")}
        description={t("pnlPerContract.description")}
      />
      <WidgetBody size={size} className="min-h-0">
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_AVERAGE_PNL}
            xDataKey="instrument"
            yDataKey="averagePnl"
            showReferenceLine
          />
        ) : !hasData ? (
          <WidgetEmpty size={size} message={t("widgets.empty.noTrades")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin(size)}>
              <WidgetChartGrid />
              <XAxis
                dataKey="instrument"
                {...axisProps(size)}
                height={compact ? 32 : 40}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                {...axisProps(size)}
                width={compact ? 44 : 52}
                tickFormatter={(value: number) =>
                  formatCompactCurrency(value, locale)
                }
                domain={yDomain}
              />
              <WidgetZeroLine />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                isAnimationActive={false}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as InstrumentRow;
                  const winRate =
                    row.tradeCount > 0
                      ? (row.winCount / row.tradeCount) * 100
                      : 0;
                  return (
                    <WidgetTooltip
                      title={row.instrument}
                      rows={[
                        {
                          label: t("pnlPerContract.tooltip.averagePnl"),
                          value: formatCurrency(row.averagePnl, locale),
                          toneClassName: pnlToneClass(pnlTone(row.averagePnl)),
                        },
                        {
                          label: t("pnlPerContract.tooltip.totalPnl"),
                          value: formatCurrency(row.totalPnl, locale),
                          toneClassName: pnlToneClass(pnlTone(row.totalPnl)),
                        },
                        {
                          label: t("pnlPerContract.tooltip.trades"),
                          value: formatCount(row.tradeCount, locale),
                        },
                        {
                          label: t("pnlPerContract.tooltip.winRate"),
                          value: formatPercent(winRate, locale),
                        },
                        {
                          label: t("pnlPerContract.tooltip.totalContracts"),
                          value: formatCount(row.totalContracts, locale),
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="averagePnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={compact ? 25 : 40}
                isAnimationActive={false}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.instrument}
                    // Sign is the only meaning color carries here; magnitude is
                    // already carried by bar length, so no opacity ramp.
                    fill={pnlToneFill(pnlTone(entry.averagePnl))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </WidgetBody>
      <WidgetFooter size={size}>
        <span>USD</span>
        <span className="tabular-nums">
          {formatCount(totals.trades, locale)}{" "}
          {t("tickDistribution.tooltip.trades")} ·{" "}
          {formatCount(totals.contracts, locale)}{" "}
          {t("pnlPerContract.tooltip.contracts")}
        </span>
      </WidgetFooter>
    </WidgetCard>
  );
}
