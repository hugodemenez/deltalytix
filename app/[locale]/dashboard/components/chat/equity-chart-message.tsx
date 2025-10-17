"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  TooltipProps,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { useI18n } from "@/locales/client";

interface ChartDataPoint {
  date: string;
  [key: `equity_${string}`]: number | undefined;
  equity?: number;
  dailyPnL?: number | undefined;
  dailyCommissions?: number | undefined;
  netPnL?: number | undefined;
  [key: `payout_${string}`]: boolean;
  [key: `reset_${string}`]: boolean;
  [key: `payoutStatus_${string}`]: string;
  [key: `payoutAmount_${string}`]: number;
}

interface EquityChartMessageProps {
  chartData: ChartDataPoint[];
  accountNumbers: string[];
  showIndividual: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  timezone: string;
  totalTrades: number;
}

// Optimized constants
const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Reduced color array for better performance
const ACCOUNT_COLORS = [
  "hsl(var(--chart-loss))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-win))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
] as const;

// Color map function
function createAccountColorMap(accountNumbers: string[]): Map<string, string> {
  const sortedAccounts = [...accountNumbers].sort();
  return new Map(
    sortedAccounts.map((accountNumber, index) => [
      accountNumber,
      ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
    ]),
  );
}

// Custom dot renderer for payouts and resets
const renderDot = (props: any) => {
  const { cx, cy, payload, index, dataKey } = props;
  if (typeof cx !== "number" || typeof cy !== "number") {
    return (
      <circle key={`dot-${index}-empty`} cx={cx} cy={cy} r={0} fill="none" />
    );
  }

  // Extract account number from dataKey (e.g., "equity_12345" -> "12345")
  const accountNumber = dataKey?.replace("equity_", "");

  // For grouped view (dataKey is "equity"), check all accounts
  if (dataKey === "equity") {
    // Check for reset indicators
    const resetAccounts = Object.keys(payload).filter(
      (key) => key.startsWith("reset_") && payload[key],
    );
    if (resetAccounts.length > 0) {
      return (
        <circle
          key={`dot-${index}-reset`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#ff6b6b"
          stroke="white"
          strokeWidth={2}
        />
      );
    }

    // Check for payout indicators
    const payoutAccounts = Object.keys(payload).filter(
      (key) => key.startsWith("payout_") && payload[key],
    );
    if (payoutAccounts.length > 0) {
      const accountNumber = payoutAccounts[0].replace("payout_", "");
      const status = payload[`payoutStatus_${accountNumber}`] || "";
      return (
        <circle
          key={`dot-${index}-payout`}
          cx={cx}
          cy={cy}
          r={4}
          fill={getPayoutColor(status)}
          stroke="white"
          strokeWidth={1}
        />
      );
    }
  } else if (accountNumber) {
    // For individual account view, only check this specific account
    const hasReset = payload[`reset_${accountNumber}`];
    const hasPayout = payload[`payout_${accountNumber}`];

    if (hasReset) {
      return (
        <circle
          key={`dot-${index}-reset-${accountNumber}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#ff6b6b"
          stroke="white"
          strokeWidth={2}
        />
      );
    }

    if (hasPayout) {
      const status = payload[`payoutStatus_${accountNumber}`] || "";
      return (
        <circle
          key={`dot-${index}-payout-${accountNumber}`}
          cx={cx}
          cy={cy}
          r={4}
          fill={getPayoutColor(status)}
          stroke="white"
          strokeWidth={1}
        />
      );
    }
  }

  return (
    <circle key={`dot-${index}-empty`} cx={cx} cy={cy} r={0} fill="none" />
  );
};

// Get payout color based on status
const getPayoutColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "#9CA3AF";
    case "VALIDATED":
      return "#F97316";
    case "REFUSED":
      return "#DC2626";
    case "PAID":
      return "#16A34A";
    default:
      return "#9CA3AF";
  }
};

// Enhanced tooltip component
const EquityChartTooltip = React.memo(
  ({
    active,
    payload,
    data,
    showIndividual,
    accountColorMap,
    t,
  }: {
    active?: boolean;
    payload?: any[];
    data?: ChartDataPoint;
    showIndividual: boolean;
    accountColorMap: Map<string, string>;
    t: any;
  }) => {
    if (!active || !payload || !payload.length || !data) return null;

    // Find accounts with resets and payouts for this date
    const resetAccounts: string[] = [];
    const payoutAccounts: Array<{
      account: string;
      amount: number;
      status: string;
    }> = [];

    Object.keys(data).forEach((key) => {
      if (key.startsWith("reset_") && data[key as keyof ChartDataPoint]) {
        const accountNumber = key.replace("reset_", "");
        resetAccounts.push(accountNumber);
      }
      if (key.startsWith("payout_") && data[key as keyof ChartDataPoint]) {
        const accountNumber = key.replace("payout_", "");
        const amount =
          (data[
            `payoutAmount_${accountNumber}` as keyof ChartDataPoint
          ] as number) || 0;
        const status =
          (data[
            `payoutStatus_${accountNumber}` as keyof ChartDataPoint
          ] as string) || "";
        payoutAccounts.push({ account: accountNumber, amount, status });
      }
    });

    return (
      <div className="rounded-lg border bg-background p-2 shadow-xs">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("equity.tooltip.date")}
            </span>
            <span className="font-bold text-muted-foreground">
              {format(new Date(data.date), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t("equity.tooltip.totalEquity")}
            </span>
            <span className="font-bold text-foreground">
              {formatCurrency(data.equity || 0)}
            </span>
          </div>

          {/* Show reset information */}
          {resetAccounts.length > 0 && (
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("equity.tooltip.resets")}
              </span>
              <div className="space-y-1">
                {resetAccounts.map((account) => (
                  <div key={account} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          accountColorMap.get(account) || ACCOUNT_COLORS[0],
                      }}
                    />
                    <span className="text-sm text-foreground">
                      {t("equity.tooltip.accountReset", { account })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show payout information */}
          {payoutAccounts.length > 0 && (
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("equity.tooltip.payouts")}
              </span>
              <div className="space-y-1">
                {payoutAccounts.map(({ account, amount, status }) => (
                  <div key={account} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          accountColorMap.get(account) || ACCOUNT_COLORS[0],
                      }}
                    />
                    <span className="text-sm text-foreground">
                      {account}: {formatCurrency(amount)}
                    </span>
                    <span
                      className="text-xs px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: getPayoutColor(status) + "20",
                        color: getPayoutColor(status),
                      }}
                    >
                      {status.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);
EquityChartTooltip.displayName = "EquityChartTooltip";

export function EquityChartMessage({
  chartData,
  accountNumbers,
  showIndividual,
  dateRange,
  timezone,
  totalTrades,
}: EquityChartMessageProps) {
  console.log(`[EquityChartMessage] Rendering chart with:`, {
    chartData,
    accountNumbers,
    showIndividual,
    dateRange,
    timezone,
    totalTrades,
  });
  const t = useI18n();

  const accountColorMap = React.useMemo(
    () => createAccountColorMap(accountNumbers),
    [accountNumbers],
  );

  // Chart config
  const chartConfig = React.useMemo(() => {
    if (!showIndividual) {
      return {
        equity: {
          label: "Total Equity",
          color: "hsl(var(--chart-1))",
        },
      } as ChartConfig;
    }

    return accountNumbers.reduce((acc, accountNumber) => {
      acc[`equity_${accountNumber}`] = {
        label: `Account ${accountNumber}`,
        color: accountColorMap.get(accountNumber) || ACCOUNT_COLORS[0],
      };
      return acc;
    }, {} as ChartConfig);
  }, [accountNumbers, showIndividual, accountColorMap]);

  // Chart lines
  const chartLines = React.useMemo(() => {
    if (!showIndividual) {
      return (
        <Line
          type="monotone"
          dataKey="equity"
          strokeWidth={2}
          dot={renderDot}
          isAnimationActive={false}
          activeDot={{ r: 3, style: { fill: "hsl(var(--chart-2))" } }}
          stroke="hsl(var(--chart-2))"
          connectNulls={false}
        />
      );
    }

    return accountNumbers.map((accountNumber) => {
      const color = accountColorMap.get(accountNumber) || ACCOUNT_COLORS[0];
      return (
        <Line
          key={accountNumber}
          type="linear"
          dataKey={`equity_${accountNumber}`}
          strokeWidth={1.5}
          dot={renderDot}
          isAnimationActive={false}
          activeDot={{ r: 3, style: { fill: color } }}
          stroke={color}
          connectNulls={false}
        />
      );
    });
  }, [accountNumbers, showIndividual, accountColorMap]);

  if (chartData.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t("chat.chart.noData")}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {showIndividual
              ? t("chat.chart.individualView", { count: accountNumbers.length })
              : t("chat.chart.groupedView")}
          </span>
          <span>{t("chat.chart.tradeCount", { count: totalTrades })}</span>
        </div>
        <div className="text-xs">
          {format(parseISO(dateRange.start), "MMM d")} -{" "}
          {format(parseISO(dateRange.end), "MMM d, yyyy")}
        </div>
      </div>

      <div className="w-full h-[300px] border rounded-lg p-2 bg-background">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ left: 10, right: 8, top: 8, bottom: 24 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                }}
                tickFormatter={(value) => format(new Date(value), "MMM d")}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickMargin={4}
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                }}
                tickFormatter={formatCurrency}
              />
              <ReferenceLine
                y={0}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <ChartTooltip
                content={({
                  active,
                  payload,
                }: TooltipProps<number, string>) => (
                  <EquityChartTooltip
                    active={active}
                    payload={payload}
                    data={payload?.[0]?.payload as ChartDataPoint}
                    showIndividual={showIndividual}
                    accountColorMap={accountColorMap}
                    t={t}
                  />
                )}
              />
              {chartLines}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
