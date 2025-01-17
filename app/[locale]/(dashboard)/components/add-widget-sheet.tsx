"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil } from 'lucide-react'
import { useI18n } from "@/locales/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from '@/lib/utils'
import { WidgetType, WidgetSize } from '../types/dashboard'
import EquityChart from './charts/equity-chart'
import TickDistributionChart from './charts/tick-distribution'
import PNLChart from './charts/pnl-bar-chart'
import TimeOfDayTradeChart from './charts/pnl-time-bar-chart'
import TimeInPositionChart from './charts/time-in-position'
import WeekdayPNLChart from './charts/weekday-pnl'
import PnLBySideChart from './charts/pnl-by-side'
import AveragePositionTimeCard from './statistics/average-position-time-card'
import CumulativePnlCard from './statistics/cumulative-pnl-card'
import LongShortPerformanceCard from './statistics/long-short-card'
import TradePerformanceCard from './statistics/trade-performance-card'
import WinningStreakCard from './statistics/winning-streak-card'
import CalendarPnl from './calendar/calendar-pnl'
import CommissionsPnLChart from './charts/commissions-pnl'
import StatisticsWidget from './statistics/statistics-widget'
import { TradeTableReview } from './tables/trade-table-review'
import { MoodSelector } from './calendar/mood-selector'
import ChatWidget from './chat-widget'
import { NewsWidget } from './market/news-widget'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import TradeDistributionChart from './charts/trade-distribution'

interface AddWidgetSheetProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
}

interface WidgetOption {
  type: WidgetType
  title: string
  defaultSize: WidgetSize
  component: React.ReactNode
}

interface PreviewCardProps {
  onClick: () => void
  children: React.ReactNode
  className?: string
}

function PreviewCard({ onClick, className, children }: PreviewCardProps) {
  const t = useI18n()
  return (
    <div 
      className={cn(
        "cursor-pointer rounded-md relative group m-1",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-50 rounded-md border">
        <p className="text-foreground font-medium">{t('widgets.clickToAdd')}</p>
      </div>
      {children}
    </div>
  )
}

export function AddWidgetSheet({ onAddWidget }: AddWidgetSheetProps) {
  const t = useI18n()
  const [isOpen, setIsOpen] = React.useState(false)

  const handleAddWidget = (widget: WidgetOption) => {
    onAddWidget(widget.type, widget.defaultSize)
    setIsOpen(false)
  }

  const chartWidgets: WidgetOption[] = [
    {
      type: 'equityChart',
      title: t('widgets.types.equityChart'),
      defaultSize: 'medium',
      component: <EquityChart size="small" />
    },
    {
      type: 'tradeDistribution',
      title: t('widgets.types.tradeDistribution'),
      defaultSize: 'medium',
      component: <TradeDistributionChart size="small" />
    },
    {
      type: 'pnlChart',
      title: t('widgets.types.pnlChart'),
      defaultSize: 'medium',
      component: <PNLChart size="small" />
    },
    {
      type: 'timeOfDayChart',
      title: t('widgets.types.timeOfDay'),
      defaultSize: 'medium',
      component: <TimeOfDayTradeChart size="small" />
    },
    {
      type: 'timeInPositionChart',
      title: t('widgets.types.timeInPosition'),
      defaultSize: 'medium',
      component: <TimeInPositionChart size="small" />
    },
    {
      type: 'weekdayPnlChart',
      title: t('widgets.types.weekdayPnl'),
      defaultSize: 'medium',
      component: <WeekdayPNLChart size="small" />
    },
    {
      type: 'pnlBySideChart',
      title: t('widgets.types.pnlBySide'),
      defaultSize: 'medium',
      component: <PnLBySideChart size="small" />
    },
    {
      type: 'tickDistribution',
      title: t('widgets.types.tickDistribution'),
      defaultSize: 'medium',
      component: <TickDistributionChart size="small" />
    },
    {
      type: 'commissionsPnl',
      title: t('widgets.types.commissionsPnl'),
      defaultSize: 'medium',
      component: <CommissionsPnLChart size="small" />
    }
  ]

  const statisticsWidgets: WidgetOption[] = [
    {
      type: 'averagePositionTime',
      title: t('widgets.types.averagePositionTime'),
      defaultSize: 'tiny',
      component: <AveragePositionTimeCard size="tiny" />
    },
    {
      type: 'cumulativePnl',
      title: t('widgets.types.cumulativePnl'),
      defaultSize: 'tiny',
      component: <CumulativePnlCard size="tiny" />
    },
    {
      type: 'longShortPerformance',
      title: t('widgets.types.longShortPerformance'),
      defaultSize: 'tiny',
      component: <LongShortPerformanceCard size="tiny" />
    },
    {
      type: 'tradePerformance',
      title: t('widgets.types.tradePerformance'),
      defaultSize: 'tiny',
      component: <TradePerformanceCard size="tiny" />
    },
    {
      type: 'winningStreak',
      title: t('widgets.types.winningStreak'),
      defaultSize: 'tiny',
      component: <WinningStreakCard size="tiny" />
    },
  ]

  const tableWidgets: WidgetOption[] = [
    {
      type: 'tradeTableReview',
      title: t('widgets.types.tradeReviewTable'),
      defaultSize: 'extra-large',
      component: (
        <Card className="h-[300px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t('widgets.types.tradeReviewTable')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-3 py-2 bg-muted rounded-md border">
                <div className="flex-[2] h-4 bg-muted-foreground/20 rounded" />
                <div className="flex-[3] h-4 bg-muted-foreground/20 rounded" />
                <div className="flex-[2] h-4 bg-muted-foreground/20 rounded" />
                <div className="flex-[1] h-4 bg-muted-foreground/20 rounded" />
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-4 px-2 sm:px-3 py-2 border border-border/50 rounded-md">
                  <div className="flex-[2] h-3 bg-muted-foreground/10 rounded" />
                  <div className="flex-[3] h-3 bg-muted-foreground/10 rounded" />
                  <div className="flex-[2] h-3 bg-muted-foreground/10 rounded" />
                  <div className="flex-[1] h-3 bg-muted-foreground/10 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )
    }
  ]

  const otherWidgets: WidgetOption[] = [
    {
      type: 'calendarWidget',
      title: t('widgets.types.calendarView'),
      defaultSize: 'large',
      component: <div className="h-[500px]"><CalendarPnl /></div>
    },
    {
      type: 'moodSelector',
      title: t('widgets.types.moodSelector'),
      defaultSize: 'tiny',
      component: <div className="h-[100px]"><MoodSelector onMoodSelect={() => {}} /></div>
    },
    {
      type: 'chatWidget',
      title: t('widgets.types.chat'),
      defaultSize: 'medium',
      component: <div className="h-[300px]"><ChatWidget size="medium" /></div>
    },
    {
      type: 'newsWidget',
      title: t('widgets.types.marketNews'),
      defaultSize: 'medium',
      component: <div className="h-[600px]"><NewsWidget /></div>
    }
  ]

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">{t('widgets.addWidget')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90vw] sm:max-w-[640px]">
        <SheetHeader>
          <SheetTitle>{t('widgets.addWidget')}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="charts" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="charts" className="flex-1">{t('widgets.categories.charts')}</TabsTrigger>
            <TabsTrigger value="statistics" className="flex-1">{t('widgets.categories.statistics')}</TabsTrigger>
            <TabsTrigger value="tables" className="flex-1">{t('widgets.categories.tables')}</TabsTrigger>
            <TabsTrigger value="other" className="flex-1">{t('widgets.categories.other')}</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[calc(100vh-12rem)] mt-2 rounded-md pr-4">
            <TabsContent value="charts" className="mt-0">
              <div className="grid gap-4">
                {chartWidgets.map((widget) => (
                  <PreviewCard
                    key={widget.type}
                    onClick={() => handleAddWidget(widget)}
                    className="h-[300px]"
                  >
                    {widget.component}
                  </PreviewCard>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="statistics" className="mt-0">
              <div className="grid gap-4">
                {statisticsWidgets.map((widget) => (
                  <PreviewCard
                    key={widget.type}
                    onClick={() => handleAddWidget(widget)}
                    className="h-[100px]"
                  >
                    {widget.component}
                  </PreviewCard>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="tables" className="mt-0">
              <div className="grid gap-4">
                {tableWidgets.map((widget) => (
                  <PreviewCard
                    key={widget.type}
                    onClick={() => handleAddWidget(widget)}
                  >
                    {widget.component}
                  </PreviewCard>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="other" className="mt-0">
              <div className="grid gap-4">
                {otherWidgets.map((widget) => (
                  <PreviewCard
                    key={widget.type}
                    onClick={() => handleAddWidget(widget)}
                  >
                    {widget.component}
                  </PreviewCard>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
} 