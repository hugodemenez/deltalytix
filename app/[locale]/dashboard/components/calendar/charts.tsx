"use client"

import React from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"
import {
  BarChartLoadingSkeleton,
  ComposedChartLoadingSkeleton,
  LOADING_MOCK_CALENDAR_DISTRIBUTION,
  LOADING_MOCK_CALENDAR_EQUITY,
} from "@/app/[locale]/dashboard/components/charts/chart-loading-skeleton"
import { useData } from "@/context/data-provider"
import { useI18n, useCurrentLocale } from '@/locales/client'
import {
  axisProps,
  chartColors,
  chartMargin,
  chartTickFontSize,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  pnlTone,
  pnlToneClass,
  pnlToneFill,
  WidgetChartGrid,
  WidgetEmpty,
  WidgetSkeleton,
  WidgetTooltip,
  WidgetZeroLine,
  widgetType,
} from "../widgets"

interface ChartsProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
  isLoading?: boolean;
}

/** Charts live inside a modal, which is already a surface: no card around them. */
const CHART_SIZE: WidgetSize = "medium"

interface EquityDatum {
  time: string
  date: string
  balance: number
  pnl: number
  tradeNumber: number
}

interface DistributionDatum {
  name: string
  value: number
  account: string
}

/** Title on the left, the qualifier that makes it auditable on the right. */
function ChartSectionHeader({
  title,
  caption,
}: {
  title: React.ReactNode
  caption: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h4 className={widgetType.section}>{title}</h4>
      <span className={widgetType.caption}>{caption}</span>
    </div>
  )
}

function EquityTooltip({
  active,
  payload,
  isWeekly,
  t,
  locale,
}: {
  active?: boolean
  payload?: Array<{ payload: EquityDatum }>
  isWeekly: boolean
  t: ReturnType<typeof useI18n>
  locale: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <WidgetTooltip
      title={isWeekly ? data.date : data.time}
      rows={[
        {
          label: t('calendar.charts.tradePnl'),
          value: formatCurrency(data.pnl, locale),
          toneClassName: pnlToneClass(pnlTone(data.pnl)),
        },
        {
          label: t('calendar.charts.balance'),
          value: formatCurrency(data.balance, locale),
        },
      ]}
      caption={`${t('calendar.charts.tradeNumber')}: ${data.tradeNumber}`}
    />
  )
}

function DistributionTooltip({
  active,
  payload,
  totalPnL,
  t,
  locale,
}: {
  active?: boolean
  payload?: Array<{ payload: DistributionDatum }>
  totalPnL: number
  t: ReturnType<typeof useI18n>
  locale: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  const share = totalPnL !== 0 ? (data.value / totalPnL) * 100 : null
  return (
    <WidgetTooltip
      title={data.name}
      rows={[
        {
          label: t('calendar.charts.accountPnl'),
          value: formatCurrency(data.value, locale),
          toneClassName: pnlToneClass(pnlTone(data.value)),
        },
      ]}
      caption={
        share !== null
          ? `${formatPercent(share, locale)} ${t('calendar.charts.ofTotal')}`
          : undefined
      }
    />
  )
}

export function Charts({ dayData, isWeekly = false, isLoading }: ChartsProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const { isLoading: globalIsLoading } = useData()
  const showLoading =
    dayData === undefined && (isLoading === true || globalIsLoading)

  // Calculate data for charts
  const { equityChartData, chartData, totalPnL, calculateCommonDomain } = React.useMemo(() => {
    if (showLoading || !dayData?.trades?.length) {
      return {
        equityChartData: [] as EquityDatum[],
        chartData: [] as DistributionDatum[],
        totalPnL: 0,
        calculateCommonDomain: [0, 0] as [number, number]
      };
    }

    // Calculate P&L for each account
    const accountPnL = dayData.trades.reduce((acc, trade) => {
      const accountNumber = trade.accountNumber || 'Unknown'
      const totalPnL = trade.pnl - (trade.commission || 0)
      acc[accountNumber] = (acc[accountNumber] || 0) + totalPnL
      return acc
    }, {} as Record<string, number>);

    // Convert to chart data format and sort
    const chartData: DistributionDatum[] = Object.entries(accountPnL)
      .map(([account, pnl]) => ({
        name: account,
        value: pnl,
        account,
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const totalPnL = chartData.reduce((sum, item) => sum + item.value, 0);

    // Calculate equity chart data
    const equityChartData: EquityDatum[] = [...dayData.trades]
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
      .map((trade, index) => {
        const runningBalance = dayData.trades
          .slice(0, index + 1)
          .reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0);
        return {
          time: new Date(trade.entryDate).toLocaleTimeString(locale),
          date: new Date(trade.entryDate).toLocaleDateString(locale, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          balance: runningBalance,
          pnl: trade.pnl - (trade.commission || 0),
          tradeNumber: index + 1,
        }
      });

    // Calculate common domain
    const distributionValues = Object.values(accountPnL);
    const distributionMin = Math.min(...distributionValues);
    const distributionMax = Math.max(...distributionValues);

    const equityMin = Math.min(
      ...equityChartData.map(d => Math.min(d.pnl, d.balance))
    );
    const equityMax = Math.max(
      ...equityChartData.map(d => Math.max(d.pnl, d.balance))
    );

    const overallMin = Math.min(distributionMin, equityMin);
    const overallMax = Math.max(distributionMax, equityMax);

    const padding = (overallMax - overallMin) * 0.1;
    const calculateCommonDomain = [
      Math.floor((overallMin - padding) / 100) * 100,
      Math.ceil((overallMax + padding) / 100) * 100
    ] as [number, number];

    return {
      equityChartData,
      chartData,
      totalPnL,
      calculateCommonDomain
    };
  }, [showLoading, dayData?.trades, locale]);

  if (showLoading) {
    return (
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <ChartSectionHeader
            title={isWeekly ? t('calendar.charts.weeklyEquityVariation') : t('calendar.charts.equityVariation')}
            caption={<WidgetSkeleton className="inline-block h-3 w-36 align-middle" />}
          />
          <div className="h-[200px] md:h-[250px]">
            <ComposedChartLoadingSkeleton
              data={LOADING_MOCK_CALENDAR_EQUITY}
              xDataKey="time"
              barDataKey="pnl"
              lineDataKey="balance"
              loadingLabel={t("equity.loading")}
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <ChartSectionHeader
            title={isWeekly ? t('calendar.charts.weeklyPnlDistribution') : t('calendar.charts.dailyPnlDistribution')}
            caption={<WidgetSkeleton className="inline-block h-3 w-44 align-middle" />}
          />
          <div className="h-[250px] md:h-[300px]">
            <BarChartLoadingSkeleton
              data={LOADING_MOCK_CALENDAR_DISTRIBUTION}
              xDataKey="name"
              yDataKey="value"
              showReferenceLine={true}
              marginVariant="calendar"
              loadingLabel={t("equity.loading")}
            />
          </div>
        </section>
      </div>
    )
  }

  if (!dayData?.trades?.length) {
    return <WidgetEmpty message={t('calendar.charts.noTradeData')} />
  }

  const finalBalance = equityChartData[equityChartData.length - 1]?.balance ?? 0

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <ChartSectionHeader
          title={isWeekly ? t('calendar.charts.weeklyEquityVariation') : t('calendar.charts.equityVariation')}
          caption={
            <>
              {t('calendar.charts.finalBalance')}:{' '}
              <span className={cn(widgetType.value, pnlToneClass(pnlTone(finalBalance)))}>
                {formatCurrency(finalBalance, locale)}
              </span>
            </>
          }
        />
        <div className="h-[200px] md:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={equityChartData}
              margin={chartMargin(CHART_SIZE)}
            >
              <WidgetChartGrid />
              <XAxis
                dataKey={isWeekly ? "date" : "time"}
                {...axisProps(CHART_SIZE)}
                angle={-45}
                textAnchor="end"
                height={44}
                tickFormatter={(value: string) => {
                  if (isWeekly) {
                    return value;
                  }
                  const [hours, minutes] = value.split(':');
                  return `${hours}:${minutes}`;
                }}
              />
              <YAxis
                {...axisProps(CHART_SIZE)}
                tickFormatter={(value: number) => formatCompactCurrency(value, locale)}
                domain={calculateCommonDomain}
                width={56}
              />
              <WidgetZeroLine />
              <Tooltip
                content={<EquityTooltip isWeekly={isWeekly} t={t} locale={locale} />}
                wrapperStyle={{ zIndex: 1000 }}
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
              />
              <Bar
                dataKey="pnl"
                name={t('calendar.charts.tradePnl')}
                isAnimationActive={false}
              >
                {equityChartData.map((entry) => (
                  <Cell
                    key={`equity-${entry.tradeNumber}`}
                    fill={pnlToneFill(pnlTone(entry.pnl))}
                  />
                ))}
              </Bar>
              <Line
                type="stepAfter"
                dataKey="balance"
                stroke={chartColors.foreground}
                strokeWidth={2}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                name={t('calendar.charts.balance')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <ChartSectionHeader
          title={isWeekly ? t('calendar.charts.weeklyPnlDistribution') : t('calendar.charts.dailyPnlDistribution')}
          caption={
            <>
              {isWeekly ? t('calendar.charts.weeklyTotalPnlAfterComm') : t('calendar.charts.totalPnlAfterComm')}:{' '}
              <span className={cn(widgetType.value, pnlToneClass(pnlTone(totalPnL)))}>
                {formatCurrency(totalPnL, locale)}
              </span>
            </>
          }
        />
        <div className="h-[250px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={chartMargin(CHART_SIZE)}
              barCategoryGap={4}
            >
              <WidgetChartGrid />
              <XAxis
                type="category"
                dataKey="name"
                {...axisProps(CHART_SIZE)}
                height={64}
                interval={0}
                tick={(props: { x: number; y: number; payload: { value: string } }) => {
                  const { x, y, payload } = props;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        dy={8}
                        dx={-4}
                        textAnchor="end"
                        transform="rotate(-45)"
                        fontSize={chartTickFontSize(CHART_SIZE)}
                        fill={chartColors.tick}
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis
                type="number"
                {...axisProps(CHART_SIZE)}
                tickFormatter={(value: number) => formatCompactCurrency(value, locale)}
                domain={calculateCommonDomain}
                width={56}
              />
              <WidgetZeroLine />
              <Tooltip
                content={<DistributionTooltip totalPnL={totalPnL} t={t} locale={locale} />}
                wrapperStyle={{ zIndex: 1000 }}
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
              />
              <Bar
                dataKey="value"
                barSize={20}
                name={t('calendar.charts.accountPnl')}
                isAnimationActive={false}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`distribution-${entry.account}`}
                    fill={pnlToneFill(pnlTone(entry.value))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
