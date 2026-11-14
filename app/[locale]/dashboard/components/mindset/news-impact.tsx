"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { useCurrentLocale } from "@/locales/client"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { HourlyFinancialTimeline } from "@/app/[locale]/dashboard/components/mindset/hourly-financial-timeline"
import { Skeleton } from "@/components/ui/skeleton"
import { ImportanceFilter } from "@/app/[locale]/dashboard/components/importance-filter"
import { useNewsFilterStore } from "@/store/filters/news-filter-store"
import { CountryFilter } from "@/components/country-filter"
import { useFinancialEventsStore } from "../../../../../store/widgets/financial-events-store"
import { journalDayEventWindow } from "@/lib/financial-events/date-window"
import { useEnsureFinancialEvents } from "@/lib/financial-events/use-ensure-financial-events"

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
  const { status: eventsStatus, retry: retryEvents } = useEnsureFinancialEvents(
    journalDayEventWindow(date),
    locale,
  )

  // Settle the list only after the range is loaded. Loading and error stay
  // out of this effect so an empty filter is not stored as "no news".
  useEffect(() => {
    if (eventsStatus === "loading" || eventsStatus === "error") return
    const dateEvents = financialEvents.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === date.toDateString() && event.lang === locale
    })
    setEvents(dateEvents)
    setIsLoading(false)
  }, [date, financialEvents, locale, eventsStatus])

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

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('mindset.newsImpact.selectImportantNews')}</h2>
        <div className="flex items-center gap-2">
          {selectedNews.length > 0 && (
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer flex items-center gap-1"
              onClick={() => onNewsSelection([])}
            >
              {selectedNews.length} selected
              <X className="h-3 w-3 opacity-50 hover:opacity-100 transition-opacity" />
            </Badge>
          )}
          <ImportanceFilter
            value={impactLevels}
            onValueChange={setImpactLevels}
            className="h-8"
          />
          <CountryFilter value={selectedCountries} onValueChange={setSelectedCountries} countries={countries} />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {eventsStatus === "error" ? (
          <div className="flex h-full items-center justify-center rounded-lg border">
            <Button type="button" variant="outline" onClick={retryEvents}>
              {t("common.retry")}
            </Button>
          </div>
        ) : isLoading || eventsStatus === "loading" ? (
          <div className="border rounded-lg h-full">
            <div className="p-2 border-b">
              <Skeleton className="h-6 w-full" />
            </div>
            <div className="p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
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