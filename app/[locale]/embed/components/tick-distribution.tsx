"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getTickDetails } from "@/server/tick-details";
import { TickDetails } from "@/prisma/generated/prisma/browser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/locales/client";

export default function TickDistributionChartEmbed({
  trades,
}: {
  trades: {
    pnl: number;
    commission?: number;
    quantity: number;
    instrument?: string;
  }[];
}) {
  const t = useI18n();
  const [tickDetails, setTickDetails] = React.useState<
    Record<string, TickDetails>
  >({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedInstrument, setSelectedInstrument] =
    React.useState<string>("");
  const [activeTick, setActiveTick] = React.useState<string | null>(null);

  // Fetch tick details on component mount
  React.useEffect(() => {
    const fetchTickDetails = async () => {
      try {
        setIsLoading(true);
        const details = await getTickDetails();
        const tickDetailsMap = details.reduce(
          (acc, detail) => ({
            ...acc,
            [detail.ticker]: detail,
          }),
          {} as Record<string, TickDetails>,
        );
        setTickDetails(tickDetailsMap);
      } catch (error) {
        console.error("Failed to fetch tick details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickDetails();
  }, []);

  // Get available instruments from trades
  const availableInstruments = React.useMemo(() => {
    const instruments = new Set<string>();
    trades.forEach((trade) => {
      if (trade.instrument) {
        instruments.add(trade.instrument);
      }
    });
    return Array.from(instruments).sort();
  }, [trades]);

  // Set default selected instrument when instruments are available
  React.useEffect(() => {
    if (availableInstruments.length > 0 && !selectedInstrument) {
      setSelectedInstrument(availableInstruments[0]);
    }
  }, [availableInstruments, selectedInstrument]);

  const chartData = React.useMemo(() => {
    if (!trades.length || isLoading || !selectedInstrument) return [];

    const tickCounts: Record<number, number> = {};

    // Filter trades by selected instrument
    const filteredTrades = trades.filter(
      (trade) => trade.instrument === selectedInstrument,
    );

    filteredTrades.forEach((trade) => {
      // Fix ticker matching logic - sort by length descending to match longer tickers first
      // This prevents "ES" from matching "MES" trades
      const matchingTicker = Object.keys(tickDetails)
        .sort((a, b) => b.length - a.length) // Sort by length descending
        .find((ticker) => trade.instrument?.includes(ticker));

      // Use tickValue (monetary value per tick) instead of tickSize (minimum price increment)
      const tickValue = matchingTicker
        ? tickDetails[matchingTicker].tickValue
        : 1;

      // Calculate net PnL per contract first
      const netPnlPerTrade = Number(trade.pnl) - Number(trade.commission || 0);
      const pnlPerContract =
        netPnlPerTrade / Math.max(1, Number(trade.quantity));
      const ticks = Math.round(pnlPerContract / tickValue);
      tickCounts[ticks] = (tickCounts[ticks] || 0) + 1;
    });

    return Object.entries(tickCounts)
      .map(([tick, count]) => ({
        ticks: tick === "0" ? "0" : Number(tick) > 0 ? `+${tick}` : `${tick}`,
        count,
      }))
      .sort(
        (a, b) =>
          Number(a.ticks.replace("+", "")) - Number(b.ticks.replace("+", "")),
      );
  }, [trades, tickDetails, isLoading, selectedInstrument]);

  const formatCount = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();

  // Color logic similar to weekday chart
  const maxCount = React.useMemo(
    () => Math.max(...chartData.map((d) => d.count), 0),
    [chartData],
  );
  const getColor = (value: number) => {
    if (maxCount === 0) return "hsl(var(--chart-2))";
    const intensity = Math.max(0.3, value / maxCount);
    return `hsl(var(--chart-2) / ${intensity})`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length)
        setActiveTick(payload[0].payload.ticks);
      else setActiveTick(null);
    }, [active, payload]);

    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="rounded-lg border bg-background p-2 shadow-xs"
          style={{
            background: "hsl(var(--embed-tooltip-bg, var(--background)))",
            borderColor: "hsl(var(--embed-tooltip-border, var(--border)))",
            borderRadius: "var(--embed-tooltip-radius, 0.5rem)",
          }}
        >
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Ticks
              </span>
              <span className="font-bold text-muted-foreground">
                {data.ticks}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Trades
              </span>
              <span className="font-bold">{data.count}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-14">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">
              {t("embed.tickDistribution.title")}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t("embed.tickDistribution.description")}</p>
              </PopoverContent>
            </Popover>
          </div>
          {availableInstruments.length > 0 && (
            <Select
              value={selectedInstrument}
              onValueChange={setSelectedInstrument}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Instrument" />
              </SelectTrigger>
              <SelectContent>
                {availableInstruments.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {instrument}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">
                Loading tick details...
              </div>
            </div>
          ) : !selectedInstrument ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">
                No instruments available
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">
                No trades found for {selectedInstrument}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ left: 0, right: 8, top: 8, bottom: 24 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="text-border dark:opacity-[0.12] opacity-[0.2]"
                />
                <XAxis
                  dataKey="ticks"
                  tickLine={false}
                  axisLine={false}
                  height={24}
                  tickMargin={8}
                  tick={(props) => {
                    const { x, y, payload } = props as any;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={4}
                          textAnchor="middle"
                          fill="currentColor"
                          fontSize={11}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                  interval="preserveStartEnd"
                  allowDataOverflow
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={45}
                  tickMargin={4}
                  tickFormatter={formatCount}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ fontSize: "12px", zIndex: 1000 }}
                  contentStyle={{
                    background:
                      "hsl(var(--embed-tooltip-bg, var(--background)))",
                    borderColor:
                      "hsl(var(--embed-tooltip-border, var(--border)))",
                    borderRadius: "var(--embed-tooltip-radius, 0.5rem)",
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                  className="transition-all duration-300 ease-in-out"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.ticks}`}
                      fill={getColor(entry.count)}
                      opacity={
                        activeTick === entry.ticks
                          ? 1
                          : activeTick === null
                            ? 1
                            : 0.3
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
