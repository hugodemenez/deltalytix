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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { usePnLPerContractDailyStore } from "@/store/widgets/pnl-per-contract-daily-store";
import { formatInTimeZone } from "date-fns-tz";
import { fr, enUS } from "date-fns/locale";
import { useUserStore } from "@/store/user-store";
import {
  BarChartLoadingSkeleton,
  LOADING_MOCK_DATE_PNL,
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

interface PnLPerContractDailyChartProps {
  size?: WidgetSize;
}

interface DailyRow {
  date: string;
  averagePnl: number;
  totalPnl: number;
  tradeCount: number;
  winCount: number;
  totalContracts: number;
}

export default function PnLPerContractDailyChart({
  size = "medium",
}: PnLPerContractDailyChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const { timezone } = useUserStore();
  const { config, setSelectedInstrument } = usePnLPerContractDailyStore();
  const t = useI18n();
  const locale = useCurrentLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const compact = isCompactSize(size);

  // Get unique instruments from trades
  const availableInstruments = React.useMemo(() => {
    const instruments = Array.from(
      new Set(trades.map((trade) => trade.instrument).filter(Boolean)),
    );
    return instruments.sort();
  }, [trades]);

  // Set default instrument if none selected and instruments are available
  React.useEffect(() => {
    if (!config.selectedInstrument && availableInstruments.length > 0) {
      setSelectedInstrument(availableInstruments[0]);
    }
  }, [config.selectedInstrument, availableInstruments, setSelectedInstrument]);

  const chartData = React.useMemo<DailyRow[]>(() => {
    if (!config.selectedInstrument) return [];

    // Filter trades for selected instrument
    const instrumentTrades = trades.filter(
      (trade) => trade.instrument === config.selectedInstrument,
    );

    // Group trades by date
    const dateGroups = instrumentTrades.reduce(
      (acc, trade) => {
        const entryDate = new Date(trade.entryDate);
        const dateKey = formatInTimeZone(entryDate, timezone, "yyyy-MM-dd");

        if (!acc[dateKey]) {
          acc[dateKey] = {
            trades: [],
            totalPnl: 0,
            totalContracts: 0,
            winCount: 0,
          };
        }

        const netPnl = trade.pnl - (trade.commission || 0);
        acc[dateKey].trades.push(trade);
        acc[dateKey].totalPnl += netPnl;
        acc[dateKey].totalContracts += trade.quantity;
        if (netPnl > 0) {
          acc[dateKey].winCount++;
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

    // Convert to chart data format and sort by date
    return Object.entries(dateGroups)
      .map(([date, data]) => ({
        date,
        // Guarded: a day with no contracts is 0, never NaN.
        averagePnl:
          data.totalContracts > 0 ? data.totalPnl / data.totalContracts : 0,
        totalPnl: data.totalPnl,
        tradeCount: data.trades.length,
        winCount: data.winCount,
        totalContracts: data.totalContracts,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades, config.selectedInstrument, timezone]);

  // Bar length is a magnitude encoding, so the domain always contains zero;
  // the 10% headroom only ever extends away from the baseline.
  const yDomain = React.useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 0];
    const values = chartData.map((row) => row.averagePnl);
    return [
      Math.min(Math.min(...values) * 1.1, 0),
      Math.max(Math.max(...values) * 1.1, 0),
    ];
  }, [chartData]);

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

  const hasData = chartData.length > 0;

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t("pnlPerContractDaily.title")}
        description={t("pnlPerContractDaily.description")}
        actions={
          <Select
            value={config.selectedInstrument}
            onValueChange={setSelectedInstrument}
          >
            <SelectTrigger
              className={cn("w-[120px]", compact ? "h-7 text-xs" : "h-8 text-sm")}
              aria-label={t("pnlPerContractDaily.selectInstrument")}
            >
              <SelectValue
                placeholder={t("pnlPerContractDaily.selectInstrument")}
              />
            </SelectTrigger>
            <SelectContent>
              {availableInstruments.map((instrument) => (
                <SelectItem key={instrument} value={instrument}>
                  {instrument}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <WidgetBody size={size} flush className={cn(compact ? "p-1" : "p-2")}>
        {isLoading ? (
          <BarChartLoadingSkeleton
            size={size}
            data={LOADING_MOCK_DATE_PNL}
            xDataKey="date"
            yDataKey="pnl"
            yAxisWidth={52}
            showReferenceLine
          />
        ) : !hasData ? (
          <WidgetEmpty
            size={size}
            message={
              config.selectedInstrument
                ? t("pnlPerContractDaily.noData")
                : t("pnlPerContractDaily.selectInstrument")
            }
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin(size)}>
              <WidgetChartGrid />
              <XAxis
                dataKey="date"
                {...axisProps(size)}
                height={compact ? 20 : 24}
                minTickGap={compact ? 30 : 50}
                tickFormatter={(value: string) => {
                  const date = new Date(value);
                  return formatInTimeZone(date, timezone, "MMM d", {
                    locale: dateLocale,
                  });
                }}
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
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 1000 }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as DailyRow;
                  // Guarded: a day can never divide by a zero trade count.
                  const winRate =
                    row.tradeCount > 0
                      ? (row.winCount / row.tradeCount) * 100
                      : 0;
                  return (
                    <WidgetTooltip
                      title={formatInTimeZone(
                        new Date(row.date),
                        timezone,
                        "MMM d, yyyy",
                        { locale: dateLocale },
                      )}
                      rows={[
                        {
                          label: t("pnlPerContractDaily.tooltip.averagePnl"),
                          value: formatCurrency(row.averagePnl, locale),
                          toneClassName: pnlToneClass(pnlTone(row.averagePnl)),
                        },
                        {
                          label: t("pnlPerContractDaily.tooltip.totalPnl"),
                          value: formatCurrency(row.totalPnl, locale),
                          toneClassName: pnlToneClass(pnlTone(row.totalPnl)),
                        },
                        {
                          label: t("pnlPerContractDaily.tooltip.trades"),
                          value: formatCount(row.tradeCount, locale),
                        },
                        {
                          label: t("pnlPerContractDaily.tooltip.winRate"),
                          value: formatPercent(winRate, locale),
                        },
                        {
                          label: t("pnlPerContractDaily.tooltip.totalContracts"),
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
                    key={entry.date}
                    // Sign is the only meaning color carries here; magnitude is
                    // already carried by bar length, so no intensity ramp.
                    fill={pnlToneFill(pnlTone(entry.averagePnl))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </WidgetBody>
      <WidgetFooter size={size}>
        <span className="truncate">
          USD{config.selectedInstrument ? ` · ${config.selectedInstrument}` : ""}
        </span>
        <span className="shrink-0 tabular-nums">
          {formatCount(totals.trades, locale)}{" "}
          {t("tickDistribution.tooltip.trades")} ·{" "}
          {formatCount(totals.contracts, locale)}{" "}
          {t("pnlPerContractDaily.tooltip.contracts")}
        </span>
      </WidgetFooter>
    </WidgetCard>
  );
}
