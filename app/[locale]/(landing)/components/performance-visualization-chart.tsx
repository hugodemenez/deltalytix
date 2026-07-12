"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useI18n } from "@/locales/landing-client";
import { Pause, Play } from "lucide-react";

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
  { label: "00", value: 0 },
  { label: "01", value: 0 },
  { label: "02", value: 0 },
  { label: "03", value: 0 },
  { label: "04", value: 0 },
  { label: "05", value: 0 },
  { label: "06", value: 0 },
  { label: "07", value: 32 },
  { label: "08", value: 24 },
  { label: "09", value: 18 },
  { label: "10", value: 0 },
  { label: "11", value: 0 },
  { label: "12", value: 0 },
  { label: "13", value: 15 },
  { label: "14", value: 11 },
  { label: "15", value: 17 },
  { label: "16", value: 23 },
  { label: "17", value: 0 },
  { label: "18", value: 0 },
  { label: "19", value: 0 },
  { label: "20", value: 0 },
  { label: "21", value: 0 },
  { label: "22", value: 0 },
  { label: "23", value: 0 },
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

function DonutPreview({
  data,
}: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
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

type ChartPreview = {
  title: string;
  content: ReactNode;
};

function ChartCarouselSection({
  title,
  charts,
  carouselLabel,
  playLabel,
  pauseLabel,
}: {
  title: string;
  charts: ChartPreview[];
  carouselLabel: string;
  playLabel: string;
  pauseLabel: string;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const isAutoPlayPaused = isUserPaused || !isInView;

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.6 },
    );
    observer.observe(carousel);

    return () => observer.disconnect();
  }, []);

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

  const pauseAutoPlay = useCallback(() => {
    setIsUserPaused(true);
  }, []);

  const scrollToChart = useCallback((index: number) => {
    pauseAutoPlay();
    api?.scrollTo(index);
  }, [api, pauseAutoPlay]);

  return (
    <Carousel
      ref={carouselRef}
      setApi={setApi}
      opts={{ loop: true, align: "start" }}
      className="performance-carousel flex w-full min-w-0 flex-col px-2 sm:px-4"
      aria-label={`${carouselLabel}: ${title}`}
      data-autoplay-paused={isAutoPlayPaused}
    >
      <CarouselContent
        className="-ml-2 h-[270px] sm:-ml-3 sm:h-[310px]"
        onPointerDown={pauseAutoPlay}
      >
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
      <div className="mt-3 flex shrink-0 items-center justify-center gap-2">
        <div className="flex h-11 items-center rounded-full bg-muted px-1">
          {charts.map((chart, index) => (
            <button
              key={chart.title}
              type="button"
              onClick={() => scrollToChart(index)}
              aria-label={`${index + 1}: ${chart.title}`}
              aria-current={index === selected ? "true" : undefined}
              className="group flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span
                aria-hidden
                className={cn(
                  "relative block overflow-hidden rounded-full bg-muted-foreground/35 transition-[height,width,background-color] duration-300 ease-out",
                  index === selected
                    ? cn(
                        "h-2 w-8 bg-muted-foreground/20",
                        isUserPaused && "bg-foreground",
                      )
                    : "size-2 group-hover:bg-muted-foreground/60"
                )}
              >
                {index === selected && (
                  <span
                    key={`${title}-${selected}`}
                    className="landing-carousel-progress absolute inset-y-0 left-0 w-full origin-left rounded-full bg-foreground"
                    onAnimationEnd={() => {
                      if (!isAutoPlayPaused) api?.scrollNext();
                    }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant={isUserPaused ? "default" : "secondary"}
          size="icon"
          className={cn(
            "size-11 shrink-0 rounded-full transition-colors duration-150 ease-out",
            isUserPaused &&
              "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
          )}
          onClick={() => setIsUserPaused((paused) => !paused)}
          aria-label={
            isUserPaused
              ? playLabel
              : pauseLabel
          }
          aria-pressed={isUserPaused}
        >
          {isUserPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </Button>
      </div>
    </Carousel>
  );
}

export function PerformanceVisualizationChart({
  group = "patterns",
}: {
  group?: "patterns" | "tracking";
}) {
  const t = useI18n();
  const weekdayData = [
    { label: t("calendar.weekdays.sun"), value: 42 },
    { label: t("calendar.weekdays.mon"), value: 380 },
    { label: t("calendar.weekdays.tue"), value: -120 },
    { label: t("calendar.weekdays.wed"), value: 540 },
    { label: t("calendar.weekdays.thu"), value: 260 },
    { label: t("calendar.weekdays.fri"), value: 680 },
    { label: t("calendar.weekdays.sat"), value: -36 },
  ];
  const chartGroups: Array<{ title: string; charts: ChartPreview[] }> = [
    {
      title: t("performanceCharts.understandPatterns"),
      charts: [
        { title: t("performanceCharts.weekdayPnl"), content: <AxisBarChart data={weekdayData} /> },
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
        { title: t("performanceCharts.timeRange"), content: <AxisBarChart data={rangeData} /> },
        { title: t("performanceCharts.pnlByHour"), content: <AxisBarChart data={hourlyPnlData} /> },
      ],
    },
    {
      title: t("performanceCharts.trackPerformance"),
      charts: [
        { title: t("performanceCharts.equity"), content: <EquityPreview /> },
        { title: t("performanceCharts.dailyPnl"), content: <AxisBarChart data={dailyPnlData} /> },
        {
          title: t("performanceCharts.tradeDistribution"),
          content: <DonutPreview data={distributionData} />,
        },
        { title: t("performanceCharts.dailyTickTarget"), content: <DailyTargetPreview /> },
      ],
    },
  ];

  const selectedGroup = chartGroups[group === "patterns" ? 0 : 1];

  return (
    <div className="w-full min-w-0 py-5 sm:py-6">
      <ChartCarouselSection
        title={selectedGroup.title}
        charts={selectedGroup.charts}
        carouselLabel={t("performanceCharts.carouselLabel")}
        playLabel={t("performanceCharts.play")}
        pauseLabel={t("performanceCharts.pause")}
      />
    </div>
  );
}
