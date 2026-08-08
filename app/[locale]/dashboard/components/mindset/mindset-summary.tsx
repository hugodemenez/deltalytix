"use client"

import { useI18n } from "@/locales/client"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { fr, enUS } from "date-fns/locale"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { HourlyFinancialTimeline } from "./hourly-financial-timeline"
import { useState, useEffect } from "react"
import type { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useUserStore } from "@/store/user-store"
import { useTradesStore } from "@/store/trades-store"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import { widgetType } from "../widgets"

interface MindsetSummaryProps {
  date: Date
  emotionValue: number
  selectedNews: string[]
  journalContent: string
  onEdit: (section?: 'emotion' | 'journal' | 'news') => void
}

/** Section name plus the one control that acts on it. No pill, no icon tile. */
function SummarySectionHeader({
  title,
  editLabel,
  onEdit,
}: {
  title: string
  editLabel: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <h4 className={widgetType.section}>{title}</h4>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label={editLabel}
        onClick={onEdit}
      >
        <Pencil className="h-3 w-3" aria-hidden />
      </Button>
    </div>
  )
}

export function MindsetSummary({
  date,
  emotionValue,
  selectedNews,
  journalContent,
  onEdit
}: MindsetSummaryProps) {
  const t = useI18n()
  const { locale } = useParams()
  const dateLocale = locale === 'fr' ? fr : enUS
  const trades = useTradesStore(state => state.trades)
  const financialEvents = useFinancialEventsStore(state => state.events)
  const timezone = useUserStore(state => state.timezone)
  const [events, setEvents] = useState<FinancialEvent[]>([])
  const [showOnlySelectedNews, setShowOnlySelectedNews] = useState(true)

  useEffect(() => {
    // Filter events for the selected date, locale, and selected news
    const dateEvents = financialEvents.filter(event => {
      const eventDate = new Date(event.date)
      const matchesDate = eventDate.toDateString() === date.toDateString()
      const matchesLocale = event.lang === locale
      const matchesSelectedNews = !showOnlySelectedNews || selectedNews.includes(event.id)

      return matchesDate && matchesLocale && matchesSelectedNews
    })
    setEvents(dateEvents)
  }, [date, financialEvents, locale, selectedNews, showOnlySelectedNews])

  /*
   * Emotional state is ordinary metadata: it reads as a word, not as a colored
   * band, so nothing here competes with the P&L evidence elsewhere.
   */
  const getEmotionLabel = (value: number) => {
    if (value < 20) return t('mindset.emotion.verySad')
    if (value < 40) return t('mindset.emotion.sad')
    if (value < 60) return t('mindset.emotion.neutral')
    if (value < 80) return t('mindset.emotion.happy')
    return t('mindset.emotion.veryHappy')
  }

  // Filter trades for the selected date
  const dayTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.entryDate)
    const tradeDateString = formatInTimeZone(tradeDate, timezone, 'yyyy-MM-dd')
    const selectedDateString = formatInTimeZone(date, timezone, 'yyyy-MM-dd')
    return tradeDateString === selectedDateString
  })

  const emotionLabel = getEmotionLabel(emotionValue)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <h3 className={cn(widgetType.title, "capitalize")}>
        {format(date, 'MMMM d, yyyy', { locale: dateLocale })}
      </h3>

      <section className="flex flex-col gap-1">
        <SummarySectionHeader
          title={t('mindset.emotion.title')}
          editLabel={`${t('mindset.edit')}: ${t('mindset.emotion.title')}`}
          onEdit={() => onEdit('emotion')}
        />
        <p className="text-sm">{emotionLabel}</p>
      </section>

      <section className="flex flex-col gap-2">
        <SummarySectionHeader
          title={t('mindset.journaling.title')}
          editLabel={`${t('mindset.edit')}: ${t('mindset.journaling.title')}`}
          onEdit={() => onEdit('journal')}
        />
        {!journalContent ? (
          <p className={widgetType.label}>{t('mindset.noData')}</p>
        ) : (
          <div
            key={journalContent}
            className="prose prose-sm dark:prose-invert max-w-none [&_.ProseMirror]:outline-hidden [&_.ProseMirror]:relative [&_.ProseMirror]:h-full"
            dangerouslySetInnerHTML={{ __html: journalContent }}
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SummarySectionHeader
          title={t('mindset.newsImpact.title')}
          editLabel={`${t('mindset.edit')}: ${t('mindset.newsImpact.title')}`}
          onEdit={() => onEdit('news')}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-only-selected"
            checked={showOnlySelectedNews}
            onCheckedChange={(checked) => setShowOnlySelectedNews(checked === true)}
          />
          <Label htmlFor="show-only-selected" className={widgetType.label}>
            {t('mindset.newsImpact.showOnlySelectedNews')}
          </Label>
        </div>
        <HourlyFinancialTimeline
          date={date}
          events={events}
          trades={dayTrades}
          selectedEventIds={selectedNews}
        />
      </section>
    </div>
  )
}
