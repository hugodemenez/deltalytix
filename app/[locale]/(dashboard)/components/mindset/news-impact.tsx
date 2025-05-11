"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n } from "@/locales/client"
import { getFinancialEvents } from "@/server/financial-events"
import { FinancialEvent } from "@prisma/client"
import { toast } from "@/hooks/use-toast"
import { formatInTimeZone } from 'date-fns-tz'
import { useUserData } from "@/components/context/user-data"
import { useCurrentLocale } from "@/locales/client"
import { fr, enUS } from 'date-fns/locale'
import { ExternalLink, ChevronDown, ArrowUpDown, Clock, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { HourlyFinancialTimeline } from "@/app/[locale]/(dashboard)/components/mindset/hourly-financial-timeline"
import { Skeleton } from "@/components/ui/skeleton"

interface NewsImpactProps {
  onNext: () => void
  onBack: () => void
  selectedNews: string[]
  onNewsSelection: (newsIds: string[]) => void
  date: Date
}

type Session = 'LONDON' | 'US' | 'ASIA'

export function NewsImpact({ onNext, onBack, selectedNews, onNewsSelection, date }: NewsImpactProps) {
  const [events, setEvents] = useState<FinancialEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortByImpact, setSortByImpact] = useState<'asc' | 'desc' | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const t = useI18n()
  const { timezone } = useUserData()
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS

  // Function to determine session based on time
  const getSessionForTime = (date: Date): Session => {
    const hour = date.getUTCHours()
    
    // London session: 8:00-16:00 UTC
    if (hour >= 8 && hour < 16) return 'LONDON'
    // US session: 13:00-21:00 UTC
    if (hour >= 13 && hour < 21) return 'US'
    // Asia session: 0:00-8:00 UTC
    if (hour >= 0 && hour < 8) return 'ASIA'
    // Late US/Early Asia transition: 21:00-24:00 UTC
    return 'ASIA' // Default to ASIA for any remaining hours (21-24)
  }

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await getFinancialEvents(date)
        if (Array.isArray(fetchedEvents)) {
          // Filter events for selected date only
          const dateEvents = fetchedEvents.filter(event => {
            const eventDate = new Date(event.date)
            return eventDate.toDateString() === date.toDateString()
          })
          setEvents(dateEvents)
        } else {
          console.error('Unexpected events format:', fetchedEvents)
          setEvents([])
        }
      } catch (error) {
        console.error('Error fetching financial events:', error)
        toast({
          title: "Error",
          description: "Failed to load financial events.",
          variant: "destructive",
        })
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvents()
  }, [date])

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
  )).sort((a, b) => {
    if (a === "United States") return -1;
    if (b === "United States") return 1;
    return a.localeCompare(b);
  });

  // Filter countries based on search term
  const filteredCountries = searchTerm
    ? countries.filter(country => 
        country.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : countries

  // Filter events based on selected countries and session
  const filteredEvents = events.filter(event => {
    const matchesCountry = selectedCountries.length === 0 || 
      (event.country && selectedCountries.includes(event.country))
    
    const matchesSession = !selectedSession || 
      getSessionForTime(new Date(event.date)) === selectedSession
    
    return matchesCountry && matchesSession
  })

  const handleSelectCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    )
  }

  const handleSelectAllCountries = () => {
    setSelectedCountries(prev =>
      prev.length === countries.length ? [] : countries
    )
  }

  const isCountrySelected = (country: string) => selectedCountries.includes(country)

  // Get impact weight for sorting
  const getImpactWeight = (importance: string) => {
    switch (importance) {
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  }

  // Sort events by impact
  const sortedAndFilteredEvents = [...filteredEvents].sort((a, b) => {
    if (!sortByImpact) return 0;
    const weightA = getImpactWeight(a.importance);
    const weightB = getImpactWeight(b.importance);
    return sortByImpact === 'desc' ? weightB - weightA : weightA - weightB;
  });

  const getActiveFiltersCount = () => {
    let count = 0
    if (selectedCountries.length > 0) count++
    if (selectedSession) count++
    if (sortByImpact) count++
    return count
  }

  const handleEventClick = (event: FinancialEvent) => {
    toggleNews(event.id)
  }

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  (selectedSession || sortByImpact || selectedCountries.length > 0) && "bg-accent"
                )}
              >
                <Filter className="h-4 w-4" />
                {t('mindset.newsImpact.filters')}
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
              <Command>
                <CommandInput placeholder={t('mindset.newsImpact.searchFilters')} />
                <CommandList>
                  <CommandGroup heading={t('mindset.newsImpact.sortBy')}>
                    <CommandItem
                      onSelect={() => setSortByImpact(current => {
                        if (current === null) return 'desc'
                        if (current === 'desc') return 'asc'
                        return null
                      })}
                      className="flex items-center justify-between"
                    >
                      <span>{t('mindset.newsImpact.sortByImpact')}</span>
                      {sortByImpact && (
                        <ArrowUpDown className={cn(
                          "h-4 w-4",
                          sortByImpact === 'asc' && "rotate-180"
                        )} />
                      )}
                    </CommandItem>
                  </CommandGroup>
                  <DropdownMenuSeparator />
                  <CommandGroup heading={t('mindset.newsImpact.filterBySession')}>
                    <CommandItem
                      onSelect={() => setSelectedSession(null)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        checked={selectedSession === null}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{t('mindset.newsImpact.allSessions')}</span>
                    </CommandItem>
                    {(['LONDON', 'US', 'ASIA'] as Session[]).map((session) => (
                      <CommandItem
                        key={session}
                        onSelect={() => setSelectedSession(session)}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          checked={selectedSession === session}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{t(`mindset.newsImpact.session.${session}`)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <DropdownMenuSeparator />
                  <CommandGroup heading={t('mindset.newsImpact.filterByCountry')}>
                    <CommandItem
                      onSelect={handleSelectAllCountries}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        checked={selectedCountries.length === countries.length}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{t('mindset.newsImpact.allCountries')}</span>
                    </CommandItem>
                    <ScrollArea className="h-[200px]">
                      {filteredCountries.map(country => (
                        <CommandItem
                          key={country}
                          onSelect={() => handleSelectCountry(country)}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={isCountrySelected(country)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{country}</span>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
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
            events={sortedAndFilteredEvents}
            onEventClick={handleEventClick}
            className="h-full"
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