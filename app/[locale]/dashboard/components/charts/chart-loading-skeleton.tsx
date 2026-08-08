"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import {
  WidgetChartGrid,
  WidgetSkeleton,
  WidgetZeroLine,
  axisProps,
  chartColors,
  chartMargin,
  isCompactSize,
} from "../widgets";

/**
 * Loading geometry for the dashboard charts.
 *
 * Every placeholder mirrors the margins, axis gutters, and bar sizes of the
 * real chart it stands in for, so nothing shifts when the data lands. Colors
 * come from theme tokens, and the only motion is the shared skeleton pulse,
 * which is inert under `prefers-reduced-motion`.
 */

/** The one placeholder fill: a neutral magnitude, never a colored series. */
const MUTED_BAR_FILL = chartColors.neutral;
const MUTED_FILL_OPACITY = 0.35;
const DEFAULT_LOADING_LABEL = "Loading chart data...";

interface ChartLoadingContainerProps {
  children: React.ReactNode;
  loadingLabel?: string;
  className?: string;
}

function ChartLoadingContainer({
  children,
  loadingLabel = DEFAULT_LOADING_LABEL,
  className,
}: ChartLoadingContainerProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className={cn("w-full h-full relative", className)}
    >
      <span className="sr-only">{loadingLabel}</span>
      {children}
    </div>
  );
}

export type ChartMarginVariant = "default" | "hourly" | "calendar";

export function getChartMargins(
  size: WidgetSize = "medium",
  variant: ChartMarginVariant = "default",
) {
  // The real charts all plot on `chartMargin(size)` now, so the skeleton uses
  // the same frame for every variant and the plot never shifts on load.
  const base = chartMargin(size);
  // The calendar charts carry a taller category axis under the plot.
  const bottom = variant === "calendar" ? base.bottom + 24 : base.bottom;
  return {
    left: base.left,
    right: base.right,
    top: base.top,
    bottom,
  };
}

export function getAxisDimensions(
  size: WidgetSize = "medium",
  yAxisWidth = 60,
) {
  return {
    yAxisWidth,
    xAxisHeight: isCompactSize(size) ? 20 : 24,
  };
}

export function getSignedDomain(values: number[]) {
  if (values.length === 0) {
    return [0, 0] as [number, number];
  }

  // A length encoding needs its zero: the headroom only ever extends away
  // from the baseline, never crops it.
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [Math.min(min * 1.1, 0), Math.max(max * 1.1, 0)] as [number, number];
}

interface ChartAxisSkeletonOverlayProps {
  size?: WidgetSize;
  margin: { left: number; right: number; top: number; bottom: number };
  yAxisWidth?: number;
  xAxisHeight?: number;
  yTickCount?: number;
  xTickCount?: number;
}

export function ChartAxisSkeletonOverlay({
  size = "medium",
  margin,
  yAxisWidth = 60,
  xAxisHeight = isCompactSize(size) ? 20 : 24,
  yTickCount = 5,
  xTickCount = 6,
}: ChartAxisSkeletonOverlayProps) {
  const compact = isCompactSize(size);
  return (
    <>
      <div
        className="pointer-events-none absolute flex flex-col justify-between pr-2"
        style={{
          left: `${margin.left}px`,
          top: `${margin.top}px`,
          bottom: `${margin.bottom + xAxisHeight}px`,
          width: `${yAxisWidth}px`,
        }}
      >
        {Array.from({ length: yTickCount }).map((_, i) => (
          <WidgetSkeleton key={`y-${i}`} className="h-2.5 w-10" />
        ))}
      </div>
      <div
        className="pointer-events-none absolute flex items-center justify-between"
        style={{
          left: `${margin.left + yAxisWidth}px`,
          right: `${margin.right}px`,
          bottom: `${margin.bottom}px`,
          height: `${xAxisHeight}px`,
        }}
      >
        {Array.from({ length: xTickCount }).map((_, i) => (
          <WidgetSkeleton
            key={`x-${i}`}
            className={cn(compact ? "h-2.5 w-6" : "h-3 w-8")}
          />
        ))}
      </div>
    </>
  );
}

interface BarChartLoadingSkeletonProps {
  size?: WidgetSize;
  data: Record<string, string | number>[];
  xDataKey: string;
  yDataKey: string;
  marginVariant?: ChartMarginVariant;
  yAxisWidth?: number;
  showReferenceLine?: boolean;
  maxBarSize?: number;
  domain?: [number, number];
  xTickCount?: number;
  loadingLabel?: string;
}

export function BarChartLoadingSkeleton({
  size = "medium",
  data,
  xDataKey,
  yDataKey,
  marginVariant = "default",
  yAxisWidth = 60,
  showReferenceLine = false,
  maxBarSize,
  domain,
  xTickCount = 6,
  loadingLabel,
}: BarChartLoadingSkeletonProps) {
  const compact = isCompactSize(size);
  const margin = getChartMargins(size, marginVariant);
  const { xAxisHeight } = getAxisDimensions(size, yAxisWidth);
  const values = data.map((row) => Number(row[yDataKey]));
  const yDomain = domain ?? getSignedDomain(values);
  const barSize = maxBarSize ?? (compact ? 25 : 40);

  return (
    <ChartLoadingContainer
      loadingLabel={loadingLabel}
      className="motion-safe:animate-pulse"
    >
      <ChartAxisSkeletonOverlay
        size={size}
        margin={margin}
        yAxisWidth={yAxisWidth}
        xAxisHeight={xAxisHeight}
        xTickCount={xTickCount}
      />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin}>
          <WidgetChartGrid />
          <XAxis
            dataKey={xDataKey}
            {...axisProps(size)}
            height={xAxisHeight}
            tick={false}
            minTickGap={compact ? 30 : 50}
          />
          <YAxis
            {...axisProps(size)}
            width={yAxisWidth}
            tick={false}
            domain={yDomain}
          />
          {showReferenceLine ? <WidgetZeroLine /> : null}
          <Bar
            dataKey={yDataKey}
            radius={[3, 3, 0, 0]}
            maxBarSize={barSize}
            fill={MUTED_BAR_FILL}
            fillOpacity={MUTED_FILL_OPACITY}
            isAnimationActive={false}
          >
            {data.map((_, index) => (
              <Cell
                key={`skeleton-cell-${index}`}
                fill={MUTED_BAR_FILL}
                fillOpacity={MUTED_FILL_OPACITY}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartLoadingContainer>
  );
}

interface LineChartLoadingSkeletonProps {
  size?: WidgetSize;
  data: Record<string, string | number>[];
  xDataKey: string;
  yDataKey: string;
  showReferenceLine?: boolean;
  loadingLabel?: string;
}

export function LineChartLoadingSkeleton({
  size = "medium",
  data,
  xDataKey,
  yDataKey,
  showReferenceLine = true,
  loadingLabel,
}: LineChartLoadingSkeletonProps) {
  const compact = isCompactSize(size);
  const margin = getChartMargins(size);
  const { yAxisWidth, xAxisHeight } = getAxisDimensions(size);

  return (
    <ChartLoadingContainer
      loadingLabel={loadingLabel}
      className="motion-safe:animate-pulse"
    >
      <ChartAxisSkeletonOverlay
        size={size}
        margin={margin}
        yAxisWidth={yAxisWidth}
        xAxisHeight={xAxisHeight}
      />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={margin}>
          <WidgetChartGrid />
          <XAxis
            dataKey={xDataKey}
            {...axisProps(size)}
            height={xAxisHeight}
            tick={false}
            minTickGap={compact ? 30 : 50}
          />
          <YAxis {...axisProps(size)} width={yAxisWidth} tick={false} />
          {showReferenceLine ? <WidgetZeroLine /> : null}
          <Line
            type="monotone"
            dataKey={yDataKey}
            stroke={MUTED_BAR_FILL}
            strokeOpacity={MUTED_FILL_OPACITY}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartLoadingContainer>
  );
}

interface DonutChartLoadingSkeletonProps {
  size?: WidgetSize;
  loadingLabel?: string;
}

export function DonutChartLoadingSkeleton({
  size = "medium",
  loadingLabel,
}: DonutChartLoadingSkeletonProps) {
  const compact = isCompactSize(size);
  const mockData = [
    { name: "a", value: 55 },
    { name: "b", value: 10 },
    { name: "c", value: 35 },
  ];

  return (
    <ChartLoadingContainer
      loadingLabel={loadingLabel}
      className="motion-safe:animate-pulse flex flex-col"
    >
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mockData}
              cx="50%"
              cy="50%"
              innerRadius={compact ? "60%" : "65%"}
              outerRadius={compact ? "80%" : "85%"}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="hsl(var(--background))"
              strokeWidth={1}
              isAnimationActive={false}
            >
              {mockData.map((_, index) => (
                <Cell
                  key={`skeleton-cell-${index}`}
                  fill={MUTED_BAR_FILL}
                  fillOpacity={MUTED_FILL_OPACITY}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Matches the direct-label row the real donut renders underneath. */}
      <div
        className={cn(
          "flex items-center justify-center gap-4 shrink-0",
          compact ? "pt-1" : "pt-3",
        )}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <WidgetSkeleton
            key={`legend-${i}`}
            className={cn(compact ? "h-2.5 w-14" : "h-3 w-20")}
          />
        ))}
      </div>
    </ChartLoadingContainer>
  );
}

interface ComposedChartLoadingSkeletonProps {
  size?: WidgetSize;
  data: Record<string, string | number>[];
  xDataKey: string;
  barDataKey: string;
  lineDataKey: string;
  loadingLabel?: string;
}

export function ComposedChartLoadingSkeleton({
  size = "medium",
  data,
  xDataKey,
  barDataKey,
  lineDataKey,
  loadingLabel,
}: ComposedChartLoadingSkeletonProps) {
  const compact = isCompactSize(size);
  const margin = getChartMargins(size, "calendar");
  const { yAxisWidth, xAxisHeight } = getAxisDimensions(size);

  return (
    <ChartLoadingContainer
      loadingLabel={loadingLabel}
      className="motion-safe:animate-pulse"
    >
      <ChartAxisSkeletonOverlay
        size={size}
        margin={margin}
        yAxisWidth={yAxisWidth}
        xAxisHeight={xAxisHeight}
        xTickCount={5}
      />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={margin}>
          <WidgetChartGrid />
          <XAxis
            dataKey={xDataKey}
            {...axisProps(size)}
            height={xAxisHeight}
            tick={false}
          />
          <YAxis {...axisProps(size)} width={yAxisWidth} tick={false} />
          <WidgetZeroLine />
          <Bar
            dataKey={barDataKey}
            radius={[3, 3, 0, 0]}
            maxBarSize={compact ? 20 : 30}
            fill={MUTED_BAR_FILL}
            fillOpacity={MUTED_FILL_OPACITY}
            isAnimationActive={false}
          >
            {data.map((_, index) => (
              <Cell
                key={`bar-${index}`}
                fill={MUTED_BAR_FILL}
                fillOpacity={MUTED_FILL_OPACITY}
              />
            ))}
          </Bar>
          <Line
            type="stepAfter"
            dataKey={lineDataKey}
            stroke={MUTED_BAR_FILL}
            strokeOpacity={MUTED_FILL_OPACITY}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartLoadingContainer>
  );
}

export const LOADING_MOCK_DATE_PNL = [
  { date: "2024-12-02", pnl: 120 },
  { date: "2024-12-03", pnl: 240 },
  { date: "2024-12-11", pnl: 180 },
  { date: "2024-12-16", pnl: -90 },
  { date: "2024-12-17", pnl: -30 },
  { date: "2024-12-19", pnl: 310 },
  { date: "2024-12-20", pnl: 150 },
  { date: "2025-01-06", pnl: 220 },
  { date: "2025-01-07", pnl: 420 },
  { date: "2025-01-14", pnl: 95 },
  { date: "2025-01-15", pnl: -60 },
  { date: "2025-01-21", pnl: 280 },
];

export const LOADING_MOCK_AVERAGE_PNL = [
  { instrument: "ES", averagePnl: 42.5 },
  { instrument: "NQ", averagePnl: 18.2 },
  { instrument: "CL", averagePnl: -12.4 },
  { instrument: "GC", averagePnl: 31.8 },
  { instrument: "YM", averagePnl: -8.6 },
  { instrument: "RTY", averagePnl: 22.1 },
];

export const LOADING_MOCK_SIDE_PNL = [
  { side: "Long", pnl: 85.4 },
  { side: "Short", pnl: -24.6 },
];

export const LOADING_MOCK_HOURLY = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  avgPnl: [12, -8, 5, 18, -3, 22, 45, 30, -15, 8, 12, 28, 35, -10, 6, 14, 20, -5, 40, 16, -12, 9, 25, 7][
    hour
  ],
}));

export const LOADING_MOCK_HOURLY_TIME = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  avgTimeInPosition: [5, 8, 12, 15, 10, 18, 22, 30, 25, 14, 9, 20, 28, 16, 11, 19, 24, 13, 17, 21, 7, 10, 15, 6][
    hour
  ],
}));

export const LOADING_MOCK_HOURLY_QUANTITY = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  totalQuantity: [2, 4, 1, 6, 3, 8, 5, 10, 7, 4, 2, 9, 12, 6, 3, 7, 11, 5, 8, 4, 2, 6, 9, 3][hour],
}));

export const LOADING_MOCK_WEEKDAY = [
  { day: 0, pnl: 120 },
  { day: 1, pnl: -45 },
  { day: 2, pnl: 80 },
  { day: 3, pnl: 210 },
  { day: 4, pnl: -30 },
  { day: 5, pnl: 55 },
  { day: 6, pnl: 15 },
];

export const LOADING_MOCK_TIME_RANGE = [
  { range: "0-5m", avgPnl: 12 },
  { range: "5-15m", avgPnl: 28 },
  { range: "15-30m", avgPnl: -8 },
  { range: "30-60m", avgPnl: 45 },
  { range: "1-2h", avgPnl: 18 },
  { range: "2-4h", avgPnl: -22 },
  { range: "4-8h", avgPnl: 35 },
  { range: "8h+", avgPnl: 10 },
];

export const LOADING_MOCK_TICKS = [
  { ticks: "-4", count: 3 },
  { ticks: "-2", count: 8 },
  { ticks: "0", count: 5 },
  { ticks: "2", count: 12 },
  { ticks: "4", count: 7 },
  { ticks: "6", count: 4 },
];

export const LOADING_MOCK_EQUITY = [
  { date: "2024-12-02", equity: 50000 },
  { date: "2024-12-05", equity: 51200 },
  { date: "2024-12-10", equity: 50800 },
  { date: "2024-12-15", equity: 52500 },
  { date: "2024-12-20", equity: 53100 },
  { date: "2024-12-27", equity: 51800 },
  { date: "2025-01-03", equity: 54200 },
  { date: "2025-01-10", equity: 55600 },
  { date: "2025-01-17", equity: 54900 },
  { date: "2025-01-24", equity: 56800 },
];

export const LOADING_MOCK_CALENDAR_DISTRIBUTION = [
  { name: "ACC-1", value: 420 },
  { name: "ACC-2", value: -180 },
  { name: "ACC-3", value: 95 },
  { name: "ACC-4", value: 260 },
];

export const LOADING_MOCK_CALENDAR_EQUITY = [
  { time: "09:30", balance: 50000, pnl: 120 },
  { time: "10:15", balance: 50250, pnl: 250 },
  { time: "11:00", balance: 49980, pnl: -270 },
  { time: "13:30", balance: 50500, pnl: 520 },
  { time: "14:45", balance: 50820, pnl: 320 },
  { time: "15:30", balance: 50650, pnl: -170 },
];
