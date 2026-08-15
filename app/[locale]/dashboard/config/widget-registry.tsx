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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccountsOverview } from '../components/accounts/accounts-overview'
import { TagWidget } from '../components/filters/tag-widget'
import ProfitFactorCard from '../components/statistics/profit-factor-card'
import DailyTickTargetChart from '../components/charts/daily-tick-target'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
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
                  ? i === 1 ? "flex-3" : "flex-2"
                  : i < 2 ? "flex-2" : "flex-1"
              )} />
            ))}
          </div>
          {[...Array(4)].map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2 sm:gap-4 px-2 sm:px-3 py-2 border border-border/50 rounded-md">
              {Array(type === 'tradeTableReview' ? 4 : 5).fill(0).map((_, i) => (
                <div key={i} className={cn(
                  "h-3 bg-muted-foreground/10 rounded",
                  type === 'tradeTableReview' 
                    ? i === 1 ? "flex-3" : "flex-2"
                    : i < 2 ? "flex-2" : "flex-1"
                )} />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function createPropfirmPreview() {
  // Sample data for the preview
  const data = [
    { name: '1', equity: 100, drawdown: 95 },
    { name: '2', equity: 120, drawdown: 110 },
    { name: '3', equity: 115, drawdown: 105 },
    { name: '4', equity: 130, drawdown: 120 },
    { name: '5', equity: 140, drawdown: 130 },
    { name: '6', equity: 150, drawdown: 140 },
  ]

  return (
    <Card className="h-[300px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Propfirm</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="w-full flex flex-col gap-3">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="flex flex-col gap-2 p-3 bg-muted rounded-md border">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
                <div className="h-4 w-16 bg-muted-foreground/20 rounded" />
              </div>
              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="drawdown"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function createMindsetPreview() {
  const t = useI18n()
  return (
    <Card className="h-[300px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('mindset.title')}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <div className="h-1.5 w-1.5 rounded-full bg-muted" />
              <div className="h-1.5 w-1.5 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-row">
        {/* Timeline mock */}
        <div className="w-16 border-r p-2 flex flex-col gap-1">
          {[...Array(7)].map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center",
                index === 2 ? "bg-primary border-primary" : "border-muted-foreground/20"
              )}>
                <div className="h-1 w-1 rounded-full bg-white" />
              </div>
              {index < 6 && <div className="h-4 w-px bg-muted-foreground/20" />}
            </div>
          ))}
        </div>
        
        {/* Content area mock */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-muted rounded-full" />
              <div className="h-6 w-20 bg-muted rounded-full" />
              <div className="h-6 w-18 bg-muted rounded-full" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
            <div className="h-16 w-full bg-muted rounded border" />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="h-4 w-28 bg-muted-foreground/20 rounded" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-muted rounded-full" />
              <div className="h-2 flex-1 bg-muted-foreground/10 rounded-full">
                <div className="h-2 w-1/2 bg-primary rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-medium">Calendar</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground p-1">
              {translateWeekday(t, day)}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 h-[calc(100%-40px)]">
          {/* Calendar days - just empty boxes showing the structure */}
          {Array.from({ length: 35 }, (_, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center justify-center p-1 rounded border border-border hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="h-4 w-full bg-muted-foreground/10 rounded mb-0.5" />
              <div className="h-2 w-3/4 bg-muted-foreground/5 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CreateChatPreview() {
  const t = useI18n()

  return (
    <Card className="h-[300px] flex flex-col bg-background relative">
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            Reset
          </Button>
        </div>
      </CardHeader>
      
      {/* Chat area */}
      <CardContent className="flex-1 flex flex-col min-h-0 p-0 relative">
        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Bot message */}
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <div className="bg-muted rounded-lg p-2 max-w-[80%]">
                <div className="h-3 w-32 bg-muted-foreground/20 rounded mb-1" />
                <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
              </div>
            </div>
            
            {/* User message */}
            <div className="flex items-start gap-2 justify-end">
              <div className="bg-primary rounded-lg p-2 max-w-[80%]">
                <div className="h-3 w-20 bg-primary-foreground/40 rounded" />
              </div>
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              </div>
            </div>
            
            {/* Bot message */}
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <div className="bg-muted rounded-lg p-2 max-w-[80%]">
                <div className="h-3 w-40 bg-muted-foreground/20 rounded mb-1" />
                <div className="h-3 w-28 bg-muted-foreground/20 rounded mb-1" />
                <div className="h-3 w-16 bg-muted-foreground/20 rounded" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Input area */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-9 bg-muted rounded-md border flex items-center px-3">
              <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
            </div>
            <Button size="sm" className="h-9 px-3">
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
    getPreview: () => createMindsetPreview()
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