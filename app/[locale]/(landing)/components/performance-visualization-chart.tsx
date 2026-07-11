"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useI18n } from "@/locales/landing-client";

const WIN = "hsl(var(--chart-win))";
const LOSS = "hsl(var(--chart-loss))";
const ACCENT = "hsl(var(--chart-3))";
const GRID = "hsl(var(--border))";

const equityData = [
  { label: "1", value: 24820 },
  { label: "4", value: 25240 },
  { label: "7", value: 25090 },
  { label: "10", value: 25860 },
  { label: "13", value: 25620 },
  { label: "16", value: 26410 },
  { label: "19", value: 26980 },
  { label: "22", value: 26740 },
  { label: "25", value: 27580 },
  { label: "28", value: 28140 },
];

const dailyPnlData = [
  { label: "02", value: 420 },
  { label: "05", value: -180 },
  { label: "08", value: 610 },
  { label: "11", value: 290 },
  { label: "14", value: -260 },
  { label: "17", value: 740 },
  { label: "20", value: 360 },
  { label: "23", value: -110 },
  { label: "26", value: 580 },
  { label: "29", value: 450 },
];

const hourlyPnlData = [
  { label: "6", value: -40 },
  { label: "7", value: 85 },
  { label: "8", value: 170 },
  { label: "9", value: 310 },
  { label: "10", value: 240 },
  { label: "11", value: -90 },
  { label: "12", value: 130 },
  { label: "13", value: 280 },
  { label: "14", value: 190 },
  { label: "15", value: -65 },
];

const positionTimeData = [
  { label: "00", value: 12 },
  { label: "01", value: 8 },
  { label: "02", value: 15 },
  { label: "03", value: 9 },
  { label: "04", value: 18 },
  { label: "05", value: 26 },
  { label: "06", value: 34 },
  { label: "07", value: 47 },
  { label: "08", value: 62 },
  { label: "09", value: 76 },
  { label: "10", value: 54 },
  { label: "11", value: 43 },
  { label: "12", value: 68 },
  { label: "13", value: 58 },
  { label: "14", value: 39 },
  { label: "15", value: 31 },
  { label: "16", value: 24 },
  { label: "17", value: 36 },
  { label: "18", value: 29 },
  { label: "19", value: 21 },
  { label: "20", value: 17 },
  { label: "21", value: 14 },
  { label: "22", value: 11 },
  { label: "23", value: 16 },
];

const sideData = [
  { label: "Long", value: 486 },
  { label: "Short", value: 238 },
];

const contractData = [
  { label: "NQ", value: 184 },
  { label: "ES", value: 136 },
  { label: "GC", value: 92 },
  { label: "CL", value: 48 },
  { label: "YM", value: -31 },
  { label: "RTY", value: -76 },
];

const contractDailyData = [
  { label: "02", value: 120 },
  { label: "05", value: 185 },
  { label: "08", value: -54 },
  { label: "11", value: 212 },
  { label: "14", value: 98 },
  { label: "17", value: -82 },
  { label: "20", value: 164 },
  { label: "23", value: 246 },
  { label: "26", value: 132 },
];

const tickData = [
  { label: "-12", value: 2 },
  { label: "-8", value: 5 },
  { label: "-4", value: 8 },
  { label: "0", value: 4 },
  { label: "+4", value: 12 },
  { label: "+8", value: 16 },
  { label: "+12", value: 9 },
  { label: "+16", value: 6 },
  { label: "+20", value: 3 },
];

const rangeData = [
  { label: "<1m", value: -24 },
  { label: "1–5m", value: 82 },
  { label: "5–15m", value: 164 },
  { label: "15–30m", value: 218 },
  { label: "30–60m", value: 106 },
  { label: "1–2h", value: -48 },
  { label: "2h+", value: 72 },
];

const commissionsData = [
  { label: "Net P/L", value: 88, color: WIN },
  { label: "Fees", value: 12, color: LOSS },
];

const distributionData = [
  { label: "Wins", value: 64, color: WIN },
  { label: "BE", value: 11, color: ACCENT },
  { label: "Losses", value: 25, color: LOSS },
];

type Point = { label: string; value: number };

function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-card">
      <div className="flex h-12 shrink-0 items-center border-b px-3 sm:h-14 sm:px-4">
        <h3 className="truncate text-sm font-medium sm:text-base">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 p-2 sm:p-4">{children}</div>
    </div>
  );
}

function AxisBarChart({
  data,
  currency = true,
  positiveNegative = true,
  valueFormatter,
}: {
  data: Point[];
  currency?: boolean;
  positiveNegative?: boolean;
  valueFormatter?: (value: number) => string;
}) {
  const formatValue = (value: number) => {
    if (valueFormatter) return valueFormatter(value);
    return currency
      ? `$${Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`
      : `${value}`;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeOpacity={0.55} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={50}
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={formatValue}
        />
        <ReferenceLine y={0} stroke={GRID} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
          formatter={(value) => [formatValue(Number(value)), ""]}
          contentStyle={{
            borderRadius: "8px",
            borderColor: GRID,
            background: "hsl(var(--background))",
            fontSize: "12px",
          }}
        />
        <Bar
          dataKey="value"
          radius={[3, 3, 0, 0]}
          maxBarSize={34}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell
              key={entry.label}
              fill={
                positiveNegative
                  ? entry.value >= 0
                    ? WIN
                    : LOSS
                  : ACCENT
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EquityPreview() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={equityData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="landing-equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={WIN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={WIN} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeOpacity={0.55} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          domain={["dataMin - 500", "dataMax + 500"]}
          width={48}
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Equity"]}
          contentStyle={{
            borderRadius: "8px",
            borderColor: GRID,
            background: "hsl(var(--background))",
            fontSize: "12px",
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={WIN}
          strokeWidth={2.5}
          fill="url(#landing-equity-fill)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={WIN}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DonutPreview({ data }: { data: typeof commissionsData }) {
  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value}%`, ""]}
            contentStyle={{
              borderRadius: "8px",
              borderColor: GRID,
              background: "hsl(var(--background))",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-1">
        {data.map((entry) => (
          <span key={entry.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.label} · {entry.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

function DailyTargetPreview() {
  return (
    <div className="flex h-full flex-col justify-center px-3 sm:px-8">
      <div className="mb-8 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Current</div>
          <div className="mt-1 text-xl font-semibold tabular-nums sm:text-3xl">368</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Target</div>
          <div className="mt-1 text-xl font-semibold tabular-nums sm:text-3xl">500</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Progress</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--chart-win))] sm:text-3xl">74%</div>
        </div>
      </div>
      <Progress value={74} className="h-2.5" />
      <div className="mt-3 flex justify-between text-xs tabular-nums text-muted-foreground">
        <span className="text-[hsl(var(--chart-win))]">+442 ticks</span>
        <span className="text-[hsl(var(--chart-loss))]">−74 ticks</span>
      </div>
    </div>
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function PerformanceVisualizationChart() {
  const t = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const weekdayData = [
    { label: t("calendar.weekdays.sun"), value: 42 },
    { label: t("calendar.weekdays.mon"), value: 380 },
    { label: t("calendar.weekdays.tue"), value: -120 },
    { label: t("calendar.weekdays.wed"), value: 540 },
    { label: t("calendar.weekdays.thu"), value: 260 },
    { label: t("calendar.weekdays.fri"), value: 680 },
    { label: t("calendar.weekdays.sat"), value: -36 },
  ];

  const charts = [
    { title: t("performanceCharts.equity"), content: <EquityPreview /> },
    { title: t("performanceCharts.dailyPnl"), content: <AxisBarChart data={dailyPnlData} /> },
    { title: t("performanceCharts.pnlByHour"), content: <AxisBarChart data={hourlyPnlData} /> },
    {
      title: t("performanceCharts.timeInPosition"),
      content: (
        <AxisBarChart
          data={positionTimeData}
          currency={false}
          positiveNegative={false}
          valueFormatter={formatDuration}
        />
      ),
    },
    { title: t("performanceCharts.weekdayPnl"), content: <AxisBarChart data={weekdayData} /> },
    { title: t("performanceCharts.pnlBySide"), content: <AxisBarChart data={sideData} /> },
    { title: t("performanceCharts.pnlPerContract"), content: <AxisBarChart data={contractData} /> },
    {
      title: t("performanceCharts.dailyPnlPerContract"),
      content: <AxisBarChart data={contractDailyData} />,
    },
    {
      title: t("performanceCharts.tickDistribution"),
      content: <AxisBarChart data={tickData} currency={false} positiveNegative={false} />,
    },
    { title: t("performanceCharts.commissions"), content: <DonutPreview data={commissionsData} /> },
    { title: t("performanceCharts.tradeDistribution"), content: <DonutPreview data={distributionData} /> },
    { title: t("performanceCharts.timeRange"), content: <AxisBarChart data={rangeData} /> },
    { title: t("performanceCharts.dailyTickTarget"), content: <DailyTargetPreview /> },
  ];

  const onSelect = useCallback((carouselApi: NonNullable<CarouselApi>) => {
    setSelected(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true, align: "start" }}
      className="flex h-full w-full min-w-0 flex-col px-2 py-3 sm:px-4 sm:py-4"
      aria-label={t("performanceCharts.carouselLabel")}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
            {t("performanceCharts.eyebrow")}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {selected + 1} / {charts.length}
          </p>
        </div>
        <div className="flex gap-2">
          <CarouselPrevious
            className="!static size-8 translate-y-0 sm:size-9"
            aria-label={t("performanceCharts.previous")}
          />
          <CarouselNext
            className="!static size-8 translate-y-0 sm:size-9"
            aria-label={t("performanceCharts.next")}
          />
        </div>
      </div>
      <CarouselContent className="-ml-2 h-[300px] sm:-ml-3 sm:h-[340px]">
        {charts.map((chart, index) => (
          <CarouselItem
            key={chart.title}
            className="h-full basis-full pl-2 sm:pl-3"
            aria-label={`${index + 1} / ${charts.length}: ${chart.title}`}
          >
            <ChartFrame title={chart.title}>{chart.content}</ChartFrame>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-3 flex shrink-0 justify-center gap-1.5" aria-hidden="true">
        {charts.map((chart, index) => (
          <button
            key={chart.title}
            type="button"
            tabIndex={-1}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              selected === index ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </Carousel>
  );
}