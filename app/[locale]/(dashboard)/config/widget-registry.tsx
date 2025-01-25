import { WidgetType, WidgetSize } from '../types/dashboard'
import EquityChart from '../components/charts/equity-chart'
import TickDistributionChart from '../components/charts/tick-distribution'
import PNLChart from '../components/charts/pnl-bar-chart'
import TimeOfDayTradeChart from '../components/charts/pnl-time-bar-chart'
import TimeInPositionChart from '../components/charts/time-in-position'
import WeekdayPNLChart from '../components/charts/weekday-pnl'
import PnLBySideChart from '../components/charts/pnl-by-side'
import AveragePositionTimeCard from '../components/statistics/average-position-time-card'
import CumulativePnlCard from '../components/statistics/cumulative-pnl-card'
import LongShortPerformanceCard from '../components/statistics/long-short-card'
import TradePerformanceCard from '../components/statistics/trade-performance-card'
import WinningStreakCard from '../components/statistics/winning-streak-card'
import CalendarPnl from '../components/calendar/calendar-pnl'
import CommissionsPnLChart from '../components/charts/commissions-pnl'
import StatisticsWidget from '../components/statistics/statistics-widget'
import { TradeTableReview } from '../components/tables/trade-table-review'
import { MoodSelector } from '../components/calendar/mood-selector'
import ChatWidget from '../components/chat-widget'
import { NewsWidget } from '../components/market/news-widget'
import TradeDistributionChart from '../components/charts/trade-distribution'
import { ConsistencyTable } from '../components/tables/consistency-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface WidgetConfig {
  type: WidgetType
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
  category: 'charts' | 'statistics' | 'tables' | 'other'
  requiresFullWidth?: boolean
  minWidth?: number
  minHeight?: number
  previewHeight?: number
  getComponent: (props: { size: WidgetSize }) => JSX.Element
  getPreview: () => JSX.Element
}

// Helper function to create table preview
function createTablePreview(type: 'tradeTableReview' | 'consistencyTable') {
  return (
    <Card className="h-[300px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {type === 'tradeTableReview' ? 'Trade Review' : 'Consistency Analysis'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-3 py-2 bg-muted rounded-md border">
            {Array(type === 'tradeTableReview' ? 4 : 5).fill(0).map((_, i) => (
              <div key={i} className={cn(
                "h-4 bg-muted-foreground/20 rounded",
                type === 'tradeTableReview' 
                  ? i === 1 ? "flex-[3]" : "flex-[2]"
                  : i < 2 ? "flex-[2]" : "flex-[1]"
              )} />
            ))}
          </div>
          {[...Array(4)].map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2 sm:gap-4 px-2 sm:px-3 py-2 border border-border/50 rounded-md">
              {Array(type === 'tradeTableReview' ? 4 : 5).fill(0).map((_, i) => (
                <div key={i} className={cn(
                  "h-3 bg-muted-foreground/10 rounded",
                  type === 'tradeTableReview' 
                    ? i === 1 ? "flex-[3]" : "flex-[2]"
                    : i < 2 ? "flex-[2]" : "flex-[1]"
                )} />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  equityChart: {
    type: 'equityChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <EquityChart size={size} />,
    getPreview: () => <EquityChart size="small" />
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
  weekdayPnlChart: {
    type: 'weekdayPnlChart',
    defaultSize: 'medium',
    allowedSizes: ['small', 'small-long', 'medium', 'large'],
    category: 'charts',
    previewHeight: 300,
    getComponent: ({ size }) => <WeekdayPNLChart size={size} />,
    getPreview: () => <WeekdayPNLChart size="small" />
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
  statisticsWidget: {
    type: 'statisticsWidget',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium'],
    category: 'statistics',
    previewHeight: 400,
    getComponent: ({ size }) => <StatisticsWidget size={size} />,
    getPreview: () => <StatisticsWidget size="medium" />
  },
  calendarWidget: {
    type: 'calendarWidget',
    defaultSize: 'large',
    allowedSizes: ['large', 'extra-large'],
    category: 'other',
    previewHeight: 500,
    getComponent: () => <CalendarPnl />,
    getPreview: () => <div className="h-[500px]"><CalendarPnl /></div>
  },
  moodSelector: {
    type: 'moodSelector',
    defaultSize: 'tiny',
    allowedSizes: ['tiny'],
    category: 'other',
    previewHeight: 100,
    getComponent: () => <MoodSelector onMoodSelect={() => {}} />,
    getPreview: () => <div className="h-[100px]"><MoodSelector onMoodSelect={() => {}} /></div>
  },
  chatWidget: {
    type: 'chatWidget',
    defaultSize: 'large',
    allowedSizes: ['large'],
    category: 'other',
    previewHeight: 300,
    getComponent: ({ size }) => <ChatWidget size={size} />,
    getPreview: () => <div className="h-[300px]"><ChatWidget size="large" /></div>
  },
  newsWidget: {
    type: 'newsWidget',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    category: 'other',
    previewHeight: 600,
    getComponent: () => <NewsWidget />,
    getPreview: () => <div className="h-[300px]"><NewsWidget /></div>
  },
  tradeTableReview: {
    type: 'tradeTableReview',
    defaultSize: 'extra-large',
    allowedSizes: ['extra-large'],
    category: 'tables',
    requiresFullWidth: true,
    previewHeight: 300,
    getComponent: () => <TradeTableReview />,
    getPreview: () => createTablePreview('tradeTableReview')
  },
  consistencyTable: {
    type: 'consistencyTable',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large', 'extra-large'],
    category: 'tables',
    previewHeight: 400,
    getComponent: () => <ConsistencyTable />,
    getPreview: () => <ConsistencyTable />
  }
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

export function getWidgetComponent(type: WidgetType, size: WidgetSize): JSX.Element {
  return WIDGET_REGISTRY[type].getComponent({ size })
}

export function getWidgetPreview(type: WidgetType): JSX.Element {
  return WIDGET_REGISTRY[type].getPreview()
} 