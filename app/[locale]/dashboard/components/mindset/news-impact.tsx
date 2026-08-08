"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { useCurrentLocale } from "@/locales/client"
import { HourlyFinancialTimeline } from "@/app/[locale]/dashboard/components/mindset/hourly-financial-timeline"
import { ImportanceFilter } from "@/app/[locale]/dashboard/components/importance-filter"
import { useNewsFilterStore } from "@/store/filters/news-filter-store"
import { CountryFilter } from "@/components/country-filter"
import { useFinancialEventsStore } from "../../../../../store/widgets/financial-events-store"
import { WidgetSkeleton, formatCount, widgetType } from "../widgets"

interface NewsImpactProps {
  onNext: () => void
  onBack: () => void
  selectedNews: string[]
  onNewsSelection: (newsIds: string[]) => void
  date: Date
}

export function NewsImpact({ onNext, onBack, selectedNews, onNewsSelection, date }: NewsImpactProps) {
  const [events, setEvents] = useState<FinancialEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { impactLevels, setImpactLevels, selectedCountries, setSelectedCountries } = useNewsFilterStore()
  const t = useI18n()
  const financialEvents = useFinancialEventsStore(state => state.events)
  const locale = useCurrentLocale()

  // Filter events for the selected date
  useEffect(() => {
    const dateEvents = financialEvents.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === date.toDateString() && event.lang === locale
    })
    setEvents(dateEvents)
    setIsLoading(false)
  }, [date, financialEvents, locale])

  const toggleNews = (eventId: string) => {
    const newSelectedNews = selectedNews.includes(eventId)
      ? selectedNews.filter(id => id !== eventId)
      : [...selectedNews, eventId]
    onNewsSelection(newSelectedNews)
  }

  // Get unique countries from events and ensure they are strings
  const countries = Array.from(new Set(events
    .map(event => event.country)
    .filter((country): country is string => country !== null && country !== undefined)
  ))

  // Filter events based on selected countries and impact levels
  const filteredEvents = events.filter(event => {
    const matchesCountry = selectedCountries.length === 0 ||
      (event.country && selectedCountries.includes(event.country))

    const matchesImpact = impactLevels.length === 0 ||
      impactLevels.includes(event.importance.toLowerCase() as "low" | "medium" | "high")

    return matchesCountry && matchesImpact
  })

  const handleEventClick = (event: FinancialEvent) => {
    toggleNews(event.id)
  }

  /*
   * The selection count is a figure with a named action next to it, not a
   * clickable pill whose only affordance is a dismiss glyph.
   */
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={widgetType.title}>{t('mindset.newsImpact.selectImportantNews')}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {selectedNews.length > 0 && (
            <>
              <span className={widgetType.caption}>
                {t('mindset.editor.news.selectedCount', {
                  count: formatCount(selectedNews.length, locale),
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onNewsSelection([])}
              >
                {t('mindset.editor.news.clearSelection')}
              </Button>
            </>
          )}
          <ImportanceFilter
            value={impactLevels}
            onValueChange={setImpactLevels}
            className="h-8"
          />
          <CountryFilter value={selectedCountries} onValueChange={setSelectedCountries} countries={countries} />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full flex-col gap-4">
            <WidgetSkeleton className="h-6 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <WidgetSkeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <HourlyFinancialTimeline
            date={date}
            events={filteredEvents}
            onEventClick={handleEventClick}
            className="h-full"
            selectedEventIds={selectedNews}
          />
        )}
      </div>

      <div className="flex gap-4 border-t pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 sm:flex-none"
        >
          {t('mindset.back')}
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 sm:flex-none"
        >
          {t('mindset.next')}
        </Button>
      </div>
    </div>
  )
}
