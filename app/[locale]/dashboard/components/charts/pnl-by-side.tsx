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
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";
import {
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
  widgetType,
  WidgetBody,
  WidgetCard,
  WidgetChartGrid,
  WidgetEmpty,
  WidgetHeader,
  WidgetTooltip,
  WidgetZeroLine,
} from "../widgets";
import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_SIDE_PNL,
} from "./chart-loading-skeleton";

interface PnLBySideChartProps {
  size?: WidgetSize;
}

interface SideDatum {
  side: string;
  pnl: number;
  tradeCount: number;
  winCount: number;
  isAverage: boolean;
}

interface SideTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SideDatum }>;
  t: ReturnType<typeof useI18n>;
  locale: string;
}

function SideTooltip({ active, payload, t, locale }: SideTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const winRate =
    data.tradeCount > 0 ? (data.winCount / data.tradeCount) * 100 : 0;

  return (
    <WidgetTooltip
      title={data.side}
      rows={[
        {
          label: data.isAverage
            ? t("pnlBySide.tooltip.averageTotal")
            : t("pnl.tooltip.pnl"),
          value: formatCurrency(data.pnl, locale),
          toneClassName: pnlToneClass(pnlTone(data.pnl)),
        },
        {
          label: t("pnlBySide.tooltip.winRate"),
          value: formatPercent(winRate, locale),
        },
        {
          label: t("pnlBySide.tooltip.trades"),
          value: formatCount(data.tradeCount, locale),
        },
      ]}
      caption={`${formatCount(data.winCount, locale)} ${
        data.winCount === 1
          ? t("pnlBySide.tooltip.wins")
          : t("pnlBySide.tooltip.wins_plural")
      }`}
    />
  );
}

export default function PnLBySideChart({
  size = "medium",
}: PnLBySideChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const [showAverage, setShowAverage] = React.useState(true);
  const t = useI18n();
  const locale = useCurrentLocale();

  const chartData = React.useMemo<SideDatum[]>(() => {
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

  const maxPnL = Math.max(...chartData.map((d) => d.pnl));
  const minPnL = Math.min(...chartData.map((d) => d.pnl));
  const hasData = chartData.some((entry) => entry.tradeCount > 0);

  const switchId = React.useId();

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("pnlBySide.title")}
        description={t("pnlBySide.description")}
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor={switchId} className={widgetType.label}>
              {t("pnlBySide.toggle.showAverage")}
            </label>
            <Switch
              id={switchId}
              checked={showAverage}
              onCheckedChange={setShowAverage}
            />
          </div>
        }
      />
      <WidgetBody
        size={size}
        flush
        className={cn(isCompactSize(size) ? "p-1" : "p-2")}
      >
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_SIDE_PNL}
            xDataKey="side"
            yDataKey="pnl"
            showReferenceLine
            xTickCount={2}
          />
        ) : !hasData ? (
          <WidgetEmpty size={size} message={t("chat.noTradesAvailable")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin(size)}>
              <WidgetChartGrid />
              <XAxis
                dataKey="side"
                {...axisProps(size)}
                height={isCompactSize(size) ? 20 : 24}
              />
              <YAxis
                {...axisProps(size)}
                width={56}
                tickFormatter={(value: number) =>
                  formatCompactCurrency(value, locale)
                }
                domain={[Math.min(minPnL * 1.1, 0), Math.max(maxPnL * 1.1, 0)]}
              />
              <WidgetZeroLine />
              <Tooltip
                content={<SideTooltip t={t} locale={locale} />}
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                wrapperStyle={{ zIndex: 1000 }}
              />
              <Bar
                dataKey="pnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={isCompactSize(size) ? 25 : 40}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={pnlToneFill(pnlTone(entry.pnl))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </WidgetBody>
    </WidgetCard>
  );
}
