"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/context/data-provider";
import { Trade } from "@/prisma/generated/prisma/browser";
import { cn } from "@/lib/utils";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";
import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_HOURLY_QUANTITY,
} from "./chart-loading-skeleton";
import {
  WidgetBody,
  WidgetCard,
  WidgetChartGrid,
  WidgetEmpty,
  WidgetFooter,
  WidgetHeader,
  WidgetTooltip,
  axisProps,
  chartColors,
  chartMargin,
  formatCount,
  isCompactSize,
} from "../widgets";

interface ContractQuantityChartProps {
  size?: WidgetSize;
}

interface HourQuantityDatum {
  hour: number;
  totalQuantity: number;
  tradeCount: number;
}

export default function ContractQuantityChart({
  size = "medium",
}: ContractQuantityChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();
  const locale = useCurrentLocale();
  const compact = isCompactSize(size);

  const chartData = React.useMemo<HourQuantityDatum[]>(() => {
    const hourlyData: {
      [hour: string]: { totalQuantity: number; count: number };
    } = {};

    // Initialize hourly data for all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalQuantity: 0, count: 0 };
    }

    // Sum up quantities for each hour in UTC
    trades.forEach((trade: Trade) => {
      const hour = formatInTimeZone(new Date(trade.entryDate), "UTC", "H");
      hourlyData[hour].totalQuantity += trade.quantity;
      hourlyData[hour].count++;
    });

    // Convert to array format for Recharts
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        totalQuantity: data.totalQuantity,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [trades]);

  const totals = React.useMemo(
    () =>
      chartData.reduce(
        (acc, row) => ({
          trades: acc.trades + row.tradeCount,
          contracts: acc.contracts + row.totalQuantity,
        }),
        { trades: 0, contracts: 0 },
      ),
    [chartData],
  );

  const hasData = totals.trades > 0;

  const hourRangeLabel = React.useCallback(
    (hour: number) =>
      `${hour}${t("contracts.tooltip.hour")} - ${(hour + 1) % 24}${t("contracts.tooltip.hour")}`,
    [t],
  );

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("contracts.title")}
        description={t("contracts.description")}
      />
      <WidgetBody size={size} flush className={cn(compact ? "p-1" : "p-2")}>
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_HOURLY_QUANTITY}
            xDataKey="hour"
            yDataKey="totalQuantity"
            marginVariant="hourly"
            yAxisWidth={45}
            xTickCount={8}
          />
        ) : !hasData ? (
          <WidgetEmpty size={size} message={t("widgets.empty.noTrades")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin(size)}>
              <WidgetChartGrid />
              <XAxis
                dataKey="hour"
                {...axisProps(size)}
                height={compact ? 20 : 24}
                tickFormatter={(value: number) =>
                  `${value}${t("contracts.tooltip.hour")}`
                }
                ticks={
                  compact ? [0, 6, 12, 18] : [0, 3, 6, 9, 12, 15, 18, 21]
                }
              />
              <YAxis
                {...axisProps(size)}
                width={compact ? 36 : 44}
                // A count of contracts: unsigned, so the domain starts at zero
                // and bar length reads as magnitude directly.
                allowDecimals={false}
                tickFormatter={(value: number) => formatCount(value, locale)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 1000 }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as HourQuantityDatum;
                  return (
                    <WidgetTooltip
                      title={hourRangeLabel(row.hour)}
                      rows={[
                        {
                          label: t("contracts.tooltip.totalContracts"),
                          value: formatCount(row.totalQuantity, locale),
                        },
                        {
                          label: t("contracts.tooltip.numberOfTrades"),
                          value: formatCount(row.tradeCount, locale),
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="totalQuantity"
                radius={[3, 3, 0, 0]}
                maxBarSize={compact ? 25 : 40}
                // Volume is an unsigned magnitude, so it stays monochrome; bar
                // length already carries how busy the hour was.
                fill={chartColors.neutral}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </WidgetBody>
      <WidgetFooter size={size}>
        <span>{t("contracts.axis.contracts")} · UTC</span>
        <span className="tabular-nums">
          {formatCount(totals.contracts, locale)}{" "}
          {t("contracts.axis.contracts")} ·{" "}
          {formatCount(totals.trades, locale)}{" "}
          {t("tickDistribution.tooltip.trades")}
        </span>
      </WidgetFooter>
    </WidgetCard>
  );
}
