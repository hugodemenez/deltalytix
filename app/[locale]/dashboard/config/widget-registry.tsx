import React from 'react'
import { WidgetType, WidgetSize } from '../types/dashboard'
import EquityChart from '../components/charts/equity-chart'
import TickDistributionChart from '../components/charts/tick-distribution'
import PNLChart from '../components/charts/pnl-bar-chart'
import TimeOfDayTradeChart from '../components/charts/pnl-time-bar-chart'
import TimeInPositionChart from '../components/charts/time-in-position'
import TimeRangePerformanceChart from '../components/charts/time-range-performance'
import WeekdayPNLChart from '../components/charts/weekday-pnl'
import PnLBySideChart from '../components/charts/pnl-by-side'
import PnLPerContractChart from '../components/charts/pnl-per-contract'
import PnLPerContractDailyChart from '../components/charts/pnl-per-contract-daily'
import AveragePositionTimeCard from '../components/statistics/average-position-time-card'
import CumulativePnlCard from '../components/statistics/cumulative-pnl-card'
import LongShortPerformanceCard from '../components/statistics/long-short-card'
import TradePerformanceCard from '../components/statistics/trade-performance-card'
import WinningStreakCard from '../components/statistics/winning-streak-card'
import RiskRewardRatioCard from '../components/statistics/risk-reward-ratio-card'
import CalendarPnl from '../components/calendar/calendar-widget'
import CommissionsPnLChart from '../components/charts/commissions-pnl'
import StatisticsWidget from '../components/statistics/statistics-widget'
import { TradeTableReview } from '../components/tables/trade-table-review'
import { MoodSelector } from '../components/calendar/mood-selector'
import TradeDistributionChart from '../components/charts/trade-distribution'
import { Button } from '@/components/ui/button'
import { ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  WidgetBody,
  WidgetCard,
  WidgetChartSkeleton,
  WidgetHeader,
  WidgetSkeleton,
  WidgetStatListSkeleton,
  widgetType,
} from '../components/widgets'
import { AccountsOverview } from '../components/accounts/accounts-overview'
import { TagWidget } from '../components/filters/tag-widget'
import ProfitFactorCard from '../components/statistics/profit-factor-card'
import DailyTickTargetChart from '../components/charts/daily-tick-target'
import { MindsetWidget } from '../components/mindset/mindset-widget'
import ChatWidget from '../components/chat/chat'
import { useI18n } from '@/locales/client'
import { translateWeekday } from '@/lib/translation-utils'
// import MarketChart from '../components/market/market-chart'

export interface WidgetConfig {
  type: WidgetType
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
  category: 'charts' | 'statistics' | 'tables' | 'other'
  requiresFullWidth?: boolean
  minWidth?: number
  minHeight?: number
  previewHeight?: number
  getComponent: (props: { size: WidgetSize }) => React.JSX.Element
  getPreview: () => React.JSX.Element
}

/**
 * A preview is a sample of a widget, not a loading state. `WidgetSkeleton`
 * carries `motion-safe:animate-pulse` for the real loading case; inside a
 * preview every placeholder is frozen so nothing on the picker shimmers.
 */
const previewStatic = '[&_*]:motion-safe:animate-none!'

/**
 * Every preview is the same shell the real widget renders — one `WidgetCard`,
 * one `WidgetHeader`, one `WidgetBody` — so what a user previews is the frame
 * they get on the canvas.
 */
function PreviewShell({
  title,
  actions,
  flush = false,
  bodyClassName,
  children,
}: {
  title: React.ReactNode
  actions?: React.ReactNode
  flush?: boolean
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <WidgetCard className={previewStatic}>
      <WidgetHeader title={title} actions={actions} />
      <WidgetBody
        flush={flush}
        className={cn('overflow-hidden', bodyClassName)}
      >
        {children}
      </WidgetBody>
    </WidgetCard>
  )
}

// Helper function to create table preview
function createTablePreview(type: 'tradeTableReview' | 'consistencyTable') {
  // Column widths mirror the real table: an id column, a wide label column,
  // then right-aligned numeric columns.
  const columns =
    type === 'tradeTableReview'
      ? ['w-14', 'w-20', 'w-10', 'w-12', 'w-12']
      : ['w-20', 'w-20', 'w-10', 'w-10', 'w-10']

  return (
    <PreviewShell
      title={type === 'tradeTableReview' ? 'Trade review' : 'Consistency analysis'}
      flush
      bodyClassName="flex flex-col"
    >
      <div className="flex shrink-0 items-center gap-4 border-b bg-muted/50 px-4 py-2">
        {columns.map((width, index) => (
          <WidgetSkeleton key={index} className={cn('h-2.5', width)} />
        ))}
      </div>
      <div className="flex min-h-0 flex-col">
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b px-4 py-2.5 last:border-b-0"
          >
            {columns.map((width, index) => (
              <WidgetSkeleton key={index} className={cn('h-2', width)} />
            ))}
          </div>
        ))}
      </div>
    </PreviewShell>
  )
}

function createPropfirmPreview() {
  return (
    <PreviewShell title="Prop firm" bodyClassName="flex flex-col gap-4">
      {[0, 1].map((index) => (
        <div key={index} className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <WidgetSkeleton className="h-2.5 w-24" />
            <WidgetSkeleton className="h-2.5 w-16" />
          </div>
          <div className="h-16">
            <WidgetChartSkeleton />
          </div>
          <WidgetStatListSkeleton rows={2} />
        </div>
      ))}
    </PreviewShell>
  )
}

function CreateMindsetPreview() {
  const t = useI18n()
  return (
    <PreviewShell title={t('mindset.title')} flush bodyClassName="flex flex-row">
      {/* Day rail: the current day is the one selection worth a color. */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              aria-hidden
              className={cn(
                'size-2 rounded-full',
                index === 2 ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
            {index < 6 ? (
              <div aria-hidden className="h-4 w-px bg-border" />
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <WidgetSkeleton className="h-2.5 w-28" />
          <div className="flex gap-2">
            <WidgetSkeleton className="h-5 w-14 rounded-full" />
            <WidgetSkeleton className="h-5 w-16 rounded-full" />
            <WidgetSkeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <WidgetSkeleton className="h-2.5 w-20" />
          <WidgetSkeleton className="h-14 w-full" />
        </div>

        <WidgetStatListSkeleton rows={2} />
      </div>
    </PreviewShell>
  )
}

function CreateCalendarPreview() {
  const t = useI18n()
  const weekdays = [
    'calendar.weekdays.sun',
    'calendar.weekdays.mon',
    'calendar.weekdays.tue',
    'calendar.weekdays.wed',
    'calendar.weekdays.thu',
    'calendar.weekdays.fri',
    'calendar.weekdays.sat'
  ] as const

  return (
    <PreviewShell
      title="Calendar"
      bodyClassName="flex flex-col gap-2"
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      }
    >
      {/* Weekday headers */}
      <div className="grid shrink-0 grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <div key={day} className={cn(widgetType.label, 'text-center')}>
            {translateWeekday(t, day)}
          </div>
        ))}
      </div>

      {/* Calendar grid: the cell borders are the real structure of a month grid */}
      <div className="grid min-h-0 flex-1 grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <div
            key={i}
            className="flex min-h-0 flex-col justify-between rounded-sm border p-1"
          >
            <WidgetSkeleton className="h-1.5 w-4" />
            <WidgetSkeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </PreviewShell>
  )
}

function CreateChatPreview() {
  const t = useI18n()

  return (
    <PreviewShell
      title={t('chat.title')}
      flush
      bodyClassName="flex flex-col"
      actions={
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          {t('chat.resetConversation')}
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {/* Assistant turn */}
        <div className="flex flex-col gap-1.5 self-start">
          <WidgetSkeleton className="h-2.5 w-40" />
          <WidgetSkeleton className="h-2.5 w-28" />
        </div>

        {/* The reader's own turn, right aligned like the real transcript */}
        <div className="flex flex-col items-end gap-1.5 self-end rounded-md bg-muted px-3 py-2">
          <WidgetSkeleton className="h-2.5 w-24" />
        </div>

        {/* Assistant turn */}
        <div className="flex flex-col gap-1.5 self-start">
          <WidgetSkeleton className="h-2.5 w-44" />
          <WidgetSkeleton className="h-2.5 w-32" />
          <WidgetSkeleton className="h-2.5 w-20" />
        </div>
      </div>

      {/* Composer. The preview is a static sample, so the send affordance is
          inert and hidden from assistive tech rather than given invented copy. */}
      <div className="flex shrink-0 items-center gap-2 border-t p-3">
        <div className="flex h-9 flex-1 items-center rounded-md border px-3">
          <span className="text-xs text-muted-foreground">
            {t('chat.writeMessage')}
          </span>
        </div>
        <div
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <ArrowUp className="size-4" />
        </div>
      </div>
    </PreviewShell>
  )
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  weekdayPnlChart: {
    type: 'weekdayPnlChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <WeekdayPNLChart size={size} />,
    getPreview: () => <WeekdayPNLChart size="small" />
  },
  pnlChart: {
    type: 'pnlChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <PNLChart size={size} />,
    getPreview: () => <PNLChart size="small" />
  },
  timeOfDayChart: {
    type: 'timeOfDayChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TimeOfDayTradeChart size={size} />,
    getPreview: () => <TimeOfDayTradeChart size="small" />
  },
  timeInPositionChart: {
    type: 'timeInPositionChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TimeInPositionChart size={size} />,
    getPreview: () => <TimeInPositionChart size="small" />
  },
  equityChart: {
    type: 'equityChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <EquityChart size={size} />,
    getPreview: () => <EquityChart size="small" />
  },
  pnlBySideChart: {
    type: 'pnlBySideChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <PnLBySideChart size={size} />,
    getPreview: () => <PnLBySideChart size="small" />
  },
  pnlPerContractChart: {
    type: 'pnlPerContractChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <PnLPerContractChart size={size} />,
    getPreview: () => <PnLPerContractChart size="small" />
  },
  pnlPerContractDailyChart: {
    type: 'pnlPerContractDailyChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <PnLPerContractDailyChart size={size} />,
    getPreview: () => <PnLPerContractDailyChart size="small" />
  },
  tickDistribution: {
    type: 'tickDistribution',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TickDistributionChart size={size} />,
    getPreview: () => <TickDistributionChart size="small" />
  },
  commissionsPnl: {
    type: 'commissionsPnl',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <CommissionsPnLChart size={size} />,
    getPreview: () => <CommissionsPnLChart size="small" />
  },
  tradeDistribution: {
    type: 'tradeDistribution',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TradeDistributionChart size={size} />,
    getPreview: () => <TradeDistributionChart size="small" />
  },
  averagePositionTime: {
    type: 'averagePositionTime',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <AveragePositionTimeCard size={size} />,
    getPreview: () => <AveragePositionTimeCard size="tiny" />
  },
  cumulativePnl: {
    type: 'cumulativePnl',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <CumulativePnlCard size={size} />,
    getPreview: () => <CumulativePnlCard size="tiny" />
  },
  longShortPerformance: {
    type: 'longShortPerformance',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <LongShortPerformanceCard size={size} />,
    getPreview: () => <LongShortPerformanceCard size="tiny" />
  },
  tradePerformance: {
    type: 'tradePerformance',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <TradePerformanceCard size={size} />,
    getPreview: () => <TradePerformanceCard size="tiny" />
  },
  winningStreak: {
    type: 'winningStreak',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <WinningStreakCard size={size} />,
    getPreview: () => <WinningStreakCard size="tiny" />
  },
  profitFactor: {
    type: 'profitFactor',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <ProfitFactorCard size={size} />,
    getPreview: () => <ProfitFactorCard size="tiny" />
  },
  dailyTickTarget: {
    type: 'dailyTickTarget',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <DailyTickTargetChart size={size} />,
    getPreview: () => <DailyTickTargetChart size="small" />
  },
  statisticsWidget: {
    type: 'statisticsWidget',
    defaultSize: 'medium',
    allowedSizes: ['medium'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <StatisticsWidget size={size} />,
    getPreview: () => <StatisticsWidget size="small" />
  },
  chatWidget: {
    type: 'chatWidget',
    defaultSize: 'large',
    allowedSizes: ['large'],
    category: 'other',
    previewHeight: 300,
    getComponent: ({ size }) => <ChatWidget size={size} />,
    getPreview: () => <CreateChatPreview />
  },
  calendarWidget: {
    type: 'calendarWidget',
    defaultSize: 'large',
    allowedSizes: ['large', 'extra-large'],
    category: 'other',
    previewHeight: 500,
    getComponent: () => <CalendarPnl />,
    getPreview: () => <CreateCalendarPreview />
  },
  tradeTableReview: {
    type: 'tradeTableReview',
    defaultSize: 'extra-large',
    allowedSizes: ['large', 'extra-large'],
    category: 'tables',
    requiresFullWidth: true,
    previewHeight: 300,
    getComponent: () => <TradeTableReview />,
    getPreview: () => createTablePreview('tradeTableReview')
  },
  propFirm: {
    type: 'propFirm',
    defaultSize: 'extra-large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'tables',
    previewHeight: 300,
    getComponent: ({ size }) => <AccountsOverview size={size} />,
    getPreview: () => createPropfirmPreview()
  },
  timeRangePerformance: {
    type: 'timeRangePerformance',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <TimeRangePerformanceChart size={size} />,
    getPreview: () => <TimeRangePerformanceChart size="small" />
  },
  mindsetWidget: {
    type: 'mindsetWidget',
    defaultSize: 'large',
    allowedSizes: ['extra-large', 'large'],
    category: 'other',
    previewHeight: 300,
    getComponent: ({ size }) => <MindsetWidget size={size} />,
    getPreview: () => <CreateMindsetPreview />
  },
  tagWidget: {
    type: 'tagWidget',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium', 'large'],
    category: 'other',
    previewHeight: 300,
    getComponent: ({ size }) => <TagWidget />,
    getPreview: () => <div className="h-[300px]"><TagWidget /></div>
  },
  riskRewardRatio: {
    type: 'riskRewardRatio',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'statistics',
    previewHeight: 100,
    getComponent: ({ size }) => <RiskRewardRatioCard size={size} />,
    getPreview: () => <RiskRewardRatioCard size="tiny" />
  },
  // marketChart: {
  //   type: 'marketChart',
  //   defaultSize: 'large',
  //   allowedSizes: ['small', 'medium', 'large'],
  //   category: 'charts',
  //   previewHeight: 300,
  //   getComponent: ({ size }) => <MarketChart />,
  //   getPreview: () => <MarketChart />
  // },
}

export function getWidgetsByCategory(category: WidgetConfig['category']) {
  return Object.values(WIDGET_REGISTRY).filter(widget => widget.category === category)
}

export function isValidWidgetSize(type: WidgetType, size: WidgetSize): boolean {
  return WIDGET_REGISTRY[type].allowedSizes.includes(size)
}

export function getDefaultWidgetSize(type: WidgetType): WidgetSize {
  return WIDGET_REGISTRY[type].defaultSize
}

export function requiresFullWidth(type: WidgetType): boolean {
  return WIDGET_REGISTRY[type].requiresFullWidth ?? false
}

export function getWidgetComponent(type: WidgetType, size: WidgetSize): React.JSX.Element {
  return WIDGET_REGISTRY[type].getComponent({ size })
}

export function getWidgetPreview(type: WidgetType): React.JSX.Element {
  return WIDGET_REGISTRY[type].getPreview()
} 