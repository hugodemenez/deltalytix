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
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { useData } from "@/context/data-provider";
import { Trade } from "@/prisma/generated/prisma/browser";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { formatInTimeZone } from "date-fns-tz";

interface ContractQuantityChartProps {
  size?: WidgetSize;
}

const chartConfig = {
  totalQuantity: {
    label: "Total Number of Contracts",
    color: "hsl(var(--chart-loss))",
  },
} satisfies ChartConfig;

export default function ContractQuantityChart({
  size = "medium",
}: ContractQuantityChartProps) {
  const { formattedTrades: trades } = useData();
  const t = useI18n();

  const chartData = React.useMemo(() => {
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

  const maxTradeCount = Math.max(...chartData.map((data) => data.tradeCount));

  const getColor = (count: number) => {
    const intensity = Math.max(0.2, count / maxTradeCount);
    return `hsl(var(--chart-loss) / ${intensity})`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background p-2 border rounded shadow-xs">
          <p className="font-semibold">{`${label}${t("contracts.tooltip.hour")} - ${(label + 1) % 24}${t("contracts.tooltip.hour")}`}</p>
          <p className="font-bold">
            {t("contracts.tooltip.totalContracts")}: {data.totalQuantity}
          </p>
          <p>
            {t("contracts.tooltip.numberOfTrades")}: {data.tradeCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>{t("contracts.title")}</CardTitle>
        <CardDescription>{t("contracts.description")}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="text-border dark:opacity-[0.12] opacity-[0.2]"
            />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: number) =>
                `${value}${t("contracts.tooltip.hour")}`
              }
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: number) => value.toFixed(0)}
              label={{
                value: t("contracts.axis.contracts"),
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="totalQuantity"
              radius={[4, 4, 0, 0]}
              className="transition-all duration-300 ease-in-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.tradeCount)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
