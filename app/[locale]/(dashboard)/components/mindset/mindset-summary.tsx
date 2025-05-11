"use client"

import { useI18n } from "@/locales/client"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { fr, enUS } from "date-fns/locale"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserData } from "@/components/context/user-data"
import { HourlyFinancialTimeline } from "./hourly-financial-timeline"
import { getFinancialEvents } from "@/server/financial-events"
import { useState, useEffect } from "react"
import type { FinancialEvent } from "@prisma/client"

interface MindsetSummaryProps {
  date: Date
  hasTradingExperience: boolean | null
  emotionValue: number
  selectedNews: string[]
  journalContent: string
  onEdit: () => void
}

export function MindsetSummary({ 
  date, 
  hasTradingExperience, 
  emotionValue, 
  selectedNews, 
  journalContent,
  onEdit 
}: MindsetSummaryProps) {
  const t = useI18n()
  const { locale } = useParams()
  const dateLocale = locale === 'fr' ? fr : enUS
  const { trades = [] } = useUserData()
  const { timezone } = useUserData()
  const [events, setEvents] = useState<FinancialEvent[]>([])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await getFinancialEvents(date)
        if (Array.isArray(fetchedEvents)) {
          setEvents(fetchedEvents)
        }
      } catch (error) {
        console.error('Error fetching financial events:', error)
        setEvents([])
      }
    }
    fetchEvents()
  }, [date])

  const getEmotionLabel = (value: number) => {
    if (value < 20) return { label: t('mindset.emotion.verySad'), color: "text-red-500" }
    if (value < 40) return { label: t('mindset.emotion.sad'), color: "text-orange-500" }
    if (value < 60) return { label: t('mindset.emotion.neutral'), color: "text-yellow-500" }
    if (value < 80) return { label: t('mindset.emotion.happy'), color: "text-green-500" }
    return { label: t('mindset.emotion.veryHappy'), color: "text-emerald-500" }
  }

  // Filter trades for the selected date
  const dayTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.entryDate)
    const tradeDateString = formatInTimeZone(tradeDate, timezone, 'yyyy-MM-dd')
    const selectedDateString = formatInTimeZone(date, timezone, 'yyyy-MM-dd')
    return tradeDateString === selectedDateString
  })

  // Calculate trading statistics
  const stats = {
    totalTrades: dayTrades.length,
    totalPnL: dayTrades.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0),
    winRate: dayTrades.length > 0 
      ? (dayTrades.filter(trade => trade.pnl - trade.commission > 0).length / dayTrades.length) * 100 
      : 0
  }

  const emotion = getEmotionLabel(emotionValue)

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(date, 'MMMM d, yyyy', { locale: dateLocale })}
        </h2>
        <Button onClick={onEdit} size="sm">
          {t('mindset.edit')}
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('mindset.tradingQuestion.title')}
              </p>
              <p className="text-sm">
                {hasTradingExperience === null 
                  ? t('mindset.noData')
                  : hasTradingExperience 
                    ? t('mindset.tradingQuestion.yes')
                    : t('mindset.tradingQuestion.no')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('mindset.emotion.title')}
              </p>
              <p className={cn("text-sm font-medium", emotion.color)}>
                {emotion.label}
              </p>
            </div>
          </div>

          {hasTradingExperience && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {t('mindset.tradingStats.totalPnL')}
                  </span>
                </div>
                <p className={cn(
                  "text-lg font-semibold",
                  stats.totalPnL > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {stats.totalPnL.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {t('mindset.tradingStats.winRate')}
                  </span>
                </div>
                <p className="text-lg font-semibold">{stats.winRate.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('mindset.journaling.title')}
          </p>
          {!journalContent ? (
            <p className="text-sm text-muted-foreground">{t('mindset.noData')}</p>
          ) : (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:relative [&_.ProseMirror]:h-full"
              dangerouslySetInnerHTML={{ __html: journalContent }}
            />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('mindset.newsImpact.title')}
          </p>
          <HourlyFinancialTimeline
            date={date}
            events={events}
          />
        </div>
      </div>
    </div>
  )
} 