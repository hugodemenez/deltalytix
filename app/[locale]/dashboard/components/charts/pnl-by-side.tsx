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
import { Switch } from "@/components/ui/switch";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_SIDE_PNL,
} from "./chart-loading-skeleton";
import {
  CHART_GRID_PROPS_HORIZONTAL,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  CHART_ZERO_LINE_PROPS,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  honestSignedDomain,
  peakIndex,
  signedFill,
} from "./chart-glance";
import { GlanceBar } from "./chart-glance-bar";
import { ChartWidgetFrame } from "./chart-widget-frame";

interface PnLBySideChartProps {
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
              {t("pnlBySide.tooltip.side")}
            </span>
            <span className="font-bold text-muted-foreground">{data.side}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {data.isAverage ? t("pnlBySide.tooltip.averageTotal") : "Total"}{" "}
              P/L
            </span>
            <span className="font-bold">{formatCurrency(data.pnl)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlBySide.tooltip.winRate")}
            </span>
            <span className="font-bold text-muted-foreground">
              {((data.winCount / data.tradeCount) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("pnlBySide.tooltip.trades")}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} {t("pnlBySide.tooltip.trades")} ({data.winCount}{" "}
              {data.winCount === 1
                ? t("pnlBySide.tooltip.wins")
                : t("pnlBySide.tooltip.wins_plural")}
              )
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PnLBySideChart({
  size = "medium",
}: PnLBySideChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const [showAverage, setShowAverage] = React.useState(true);
  const t = useI18n();

  const chartData = React.useMemo(() => {
    const longTrades = trades.filter(
      (trade) => trade.side?.toLowerCase() === "long",
    );
    const shortTrades = trades.filter(
      (trade) => trade.side?.toLowerCase() === "short",
    );

    const longPnL = longTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const shortPnL = shortTrades.reduce((sum, trade) => sum + trade.pnl, 0);

    const longWins = longTrades.filter((trade) => trade.pnl > 0).length;
    const shortWins = shortTrades.filter((trade) => trade.pnl > 0).length;

    return [
      {
        side: "Long",
        pnl: showAverage
          ? longTrades.length > 0
            ? longPnL / longTrades.length
            : 0
          : longPnL,
        tradeCount: longTrades.length,
        winCount: longWins,
        isAverage: showAverage,
      },
      {
        side: "Short",
        pnl: showAverage
          ? shortTrades.length > 0
            ? shortPnL / shortTrades.length
            : 0
          : shortPnL,
        tradeCount: shortTrades.length,
        winCount: shortWins,
        isAverage: showAverage,
      },
    ];
  }, [trades, showAverage]);

  const hasTrades = chartData.some((entry) => entry.tradeCount > 0);
  const leaderIndex = peakIndex(chartData, (entry) => entry.pnl);
  const subtitle = !hasTrades
    ? t("pnlBySide.subtitle.empty")
    : t("pnlBySide.subtitle.best", {
        label: chartData[leaderIndex]?.side ?? "Long",
        mode: showAverage
          ? t("pnlBySide.mode.average")
          : t("pnlBySide.mode.total"),
      });

  return (
    <ChartWidgetFrame
      size={size}
      title={t("pnlBySide.title")}
      subtitle={subtitle}
      description={t("pnlBySide.description")}
      actions={
        <div className="flex items-center gap-2">
          <span
            className={
              size === "small"
                ? "text-xs text-muted-foreground"
                : "text-sm text-muted-foreground"
            }
          >
            {t("pnlBySide.toggle.showAverage")}
          </span>
          <Switch
            checked={showAverage}
            onCheckedChange={setShowAverage}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      }
    >
      {isLoading ? (
        <BarChartLoadingSkeleton
          size={size}
          data={LOADING_MOCK_SIDE_PNL}
          xDataKey="side"
          yDataKey="pnl"
          showReferenceLine
          xTickCount={2}
          yAxisWidth={size === "small" ? 40 : 56}
          layout="horizontal"
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={getChartMargins(size, "horizontal")}
          >
            <CartesianGrid {...CHART_GRID_PROPS_HORIZONTAL} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              height={size === "small" ? 20 : 24}
              tickMargin={size === "small" ? 4 : 8}
              tick={chartTickStyle(size)}
              tickFormatter={formatCurrency}
              domain={honestSignedDomain(chartData.map((entry) => entry.pnl))}
            />
            <YAxis
              type="category"
              dataKey="side"
              tickLine={false}
              axisLine={false}
              width={size === "small" ? 40 : 56}
              tickMargin={4}
              tick={chartTickStyle(size)}
            />
            <ReferenceLine x={0} {...CHART_ZERO_LINE_PROPS} />
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{
                fontSize: chartTooltipFontSize(size),
                ...CHART_TOOLTIP_WRAPPER,
              }}
            />
            <Bar
              dataKey="pnl"
              maxBarSize={chartMaxBarSize(size)}
              shape={<GlanceBar layout="horizontal" />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={signedFill(entry.pnl)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  );
}
