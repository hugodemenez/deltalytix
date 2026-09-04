"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useData } from "@/context/data-provider";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_AVERAGE_PNL,
} from "./chart-loading-skeleton";
import { namedSignedConclusion } from "./chart-conclusions";
import {
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  CHART_ZERO_LINE_PROPS,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  honestSignedDomain,
  signedFill,
} from "./chart-glance";
import { GlanceBar } from "./chart-glance-bar";
import { ChartWidgetFrame } from "./chart-widget-frame";

interface PnLPerContractChartProps {
  size?: WidgetSize;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const CustomTooltip = ({ active, payload, label }: any) => {
  const t = useI18n();
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={CHART_TOOLTIP_CLASS}>
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContract.tooltip.averagePnl")}
            </span>
            <span className="font-bold">{formatCurrency(data.averagePnl)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContract.tooltip.totalPnl")}
            </span>
            <span className="font-bold text-muted-foreground">
              {formatCurrency(data.totalPnl)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContract.tooltip.trades")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} {t("pnlPerContract.tooltip.trades")} (
              {((data.winCount / data.tradeCount) * 100).toFixed(1)}%{" "}
              {t("pnlPerContract.tooltip.winRate")})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlPerContract.tooltip.totalContracts")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.totalContracts} {t("pnlPerContract.tooltip.contracts")}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PnLPerContractChart({
  size = "medium",
}: PnLPerContractChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();

  const chartData = React.useMemo(() => {
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

  const conclusion = namedSignedConclusion(
    chartData.map((entry) => ({
      label: entry.instrument,
      value: entry.averagePnl,
    })),
  );
  const subtitle =
    conclusion.kind === "empty"
      ? t("pnlPerContract.subtitle.empty")
      : t(`pnlPerContract.subtitle.${conclusion.kind}`, {
          label: conclusion.label,
        });

  return (
    <ChartWidgetFrame
      size={size}
      title={t("pnlPerContract.title")}
      subtitle={subtitle}
      description={t("pnlPerContract.description")}
    >
      {isLoading ? (
        <BarChartLoadingSkeleton
          size={size}
          data={LOADING_MOCK_AVERAGE_PNL}
          xDataKey="instrument"
          yDataKey="averagePnl"
          showReferenceLine
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={getChartMargins(size)}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="instrument"
              tickLine={false}
              axisLine={false}
              height={size === "small" ? 20 : 24}
              tickMargin={size === "small" ? 4 : 8}
              tick={chartTickStyle(size)}
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={60}
              tickMargin={4}
              tick={chartTickStyle(size)}
              tickFormatter={formatCurrency}
              domain={honestSignedDomain(
                chartData.map((entry) => entry.averagePnl),
              )}
            />
            <ReferenceLine y={0} {...CHART_ZERO_LINE_PROPS} />
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
            <Bar
              dataKey="averagePnl"
              maxBarSize={chartMaxBarSize(size)}
              shape={<GlanceBar />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={signedFill(entry.averagePnl)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  );
}
