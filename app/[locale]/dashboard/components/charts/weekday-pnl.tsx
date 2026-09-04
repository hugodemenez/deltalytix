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
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { translateWeekdayPnL } from "@/lib/translation-utils";
import { Button } from "@/components/ui/button";
import {
  BarChartLoadingSkeleton,
  getChartMargins,
  LOADING_MOCK_WEEKDAY,
} from "./chart-loading-skeleton";
import { namedSignedConclusion } from "./chart-conclusions";
import {
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_WRAPPER,
  CHART_ZERO_LINE_PROPS,
  chartMaxBarSize,
  chartTickStyle,
  chartTooltipFontSize,
  filterBarOpacity,
  honestSignedDomain,
  signedFill,
} from "./chart-glance";
import { GlanceBar } from "./chart-glance-bar";
import { ChartWidgetFrame } from "./chart-widget-frame";

const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];

interface WeekdayPNLChartProps {
  size?: WidgetSize;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function WeekdayPNLChart({
  size = "medium",
}: WeekdayPNLChartProps) {
  const { calendarData, weekdayFilter, setWeekdayFilter, isLoading } =
    useData();
  const [activeDay, setActiveDay] = React.useState<number | null>(null);
  const t = useI18n();

  const weekdayData = React.useMemo(() => {
    const weekdayTotals = daysOfWeek.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { total: 0, count: 0 },
      }),
      {} as Record<number, { total: number; count: number }>,
    );

    Object.entries(calendarData).forEach(([date, entry]) => {
      const dayOfWeek = new Date(date).getUTCDay();
      weekdayTotals[dayOfWeek].total += entry.pnl;
      weekdayTotals[dayOfWeek].count += 1;
    });

    return daysOfWeek.map((day) => ({
      day,
      pnl:
        weekdayTotals[day].count > 0
          ? weekdayTotals[day].total / weekdayTotals[day].count
          : 0,
      tradeCount: weekdayTotals[day].count,
    }));
  }, [calendarData]);

  const conclusion = namedSignedConclusion(
    weekdayData.map((entry) => ({
      label: translateWeekdayPnL(t, entry.day),
      value: entry.pnl,
    })),
  );
  const subtitle =
    conclusion.kind === "empty"
      ? t("weekdayPnl.subtitle.empty")
      : t(`weekdayPnl.subtitle.${conclusion.kind}`, { label: conclusion.label });

  const handleClick = React.useCallback(() => {
    if (activeDay === null) return;
    const currentDays = weekdayFilter.days || [];
    if (currentDays.includes(activeDay)) {
      setWeekdayFilter({ days: currentDays.filter((d) => d !== activeDay) });
    } else {
      setWeekdayFilter({ days: [...currentDays, activeDay] });
    }
  }, [activeDay, weekdayFilter.days, setWeekdayFilter]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: (typeof weekdayData)[number] }> }) => {
    React.useEffect(() => {
      if (active && payload && payload.length) {
        setActiveDay(payload[0].payload.day);
      } else {
        setActiveDay(null);
      }
    }, [active, payload]);

    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={CHART_TOOLTIP_CLASS}>
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("weekdayPnl.tooltip.day")}
              </span>
              <span className="font-bold text-muted-foreground">
                {translateWeekdayPnL(t, data.day)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("weekdayPnl.tooltip.averagePnl")}
              </span>
              <span className="font-bold">{formatCurrency(data.pnl)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t("weekdayPnl.tooltip.trades")}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.tradeCount}{" "}
                {data.tradeCount !== 1
                  ? t("weekdayPnl.tooltip.trades_plural")
                  : t("weekdayPnl.tooltip.trade")}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const hasFilter = Boolean(weekdayFilter.days && weekdayFilter.days.length > 0);

  return (
    <ChartWidgetFrame
      size={size}
      title={t("weekdayPnl.title")}
      subtitle={subtitle}
      description={t("weekdayPnl.description")}
      contentInteractive
      onContentClick={handleClick}
      actions={
        hasFilter ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={() => setWeekdayFilter({ days: [] })}
          >
            {t("weekdayPnl.clearFilter")}
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <BarChartLoadingSkeleton
          size={size}
          data={LOADING_MOCK_WEEKDAY}
          xDataKey="day"
          yDataKey="pnl"
          yAxisWidth={45}
          xTickCount={7}
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekdayData} margin={getChartMargins(size, "hourly")}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              height={size === "small" ? 20 : 24}
              tickMargin={size === "small" ? 4 : 8}
              tick={chartTickStyle(size)}
              tickFormatter={(value) => {
                const dayName = translateWeekdayPnL(t, value);
                return size === "small" ? dayName.slice(0, 3) : dayName;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={45}
              tickMargin={4}
              tick={chartTickStyle(size)}
              tickFormatter={formatCurrency}
              domain={honestSignedDomain(weekdayData.map((entry) => entry.pnl))}
            />
            <ReferenceLine y={0} {...CHART_ZERO_LINE_PROPS} />
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
              shape={<GlanceBar />}
              className="motion-reduce:transition-none transition-opacity duration-300 ease-out"
            >
              {weekdayData.map((entry) => (
                <Cell
                  key={`cell-${entry.day}`}
                  fill={signedFill(entry.pnl)}
                  opacity={filterBarOpacity(
                    Boolean(weekdayFilter.days?.includes(entry.day)),
                    hasFilter,
                  )}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWidgetFrame>
  );
}
