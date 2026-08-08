"use client"

import { useState, useEffect } from "react"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { Journaling } from "./journaling"
import { Timeline } from "./timeline"
import { MindsetSummary } from "./mindset-summary"
import { useI18n } from "@/locales/client"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"
import {
  WidgetBody,
  WidgetCard,
  WidgetHeader,
  formatCount,
  widgetType,
} from "../widgets"
import type { EmblaCarouselType as CarouselApi } from "embla-carousel"
import { toast } from "sonner"
import { saveMindset, deleteMindset } from "@/server/journal"
import { addTagsToTradesForDay } from "@/server/trades"
import { isToday, format } from "date-fns"
import { useMoodStore } from "@/store/widgets/mood-store"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import { useTradesStore } from "@/store/trades-store"
import { useCurrentLocale } from "@/locales/client"
import { tradeMatchesDateKey } from "@/lib/trades/trade-matches-date"
import { htmlToPlainText } from "@/lib/journal/html-to-plain-text"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"

interface MindsetWidgetProps {
  size: WidgetSize
}

export function MindsetWidget({ size }: MindsetWidgetProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [emotionValue, setEmotionValue] = useState(0)
  const [selectedNews, setSelectedNews] = useState<string[]>([])
  const [journalContent, setJournalContent] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isEditing, setIsEditing] = useState(true)
  const [isTimelineVisible, setIsTimelineVisible] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const moods = useMoodStore(state => state.moods)
  const setMoods = useMoodStore(state => state.setMoods)
  const financialEvents = useFinancialEventsStore(state => state.events)
  const trades = useTradesStore(state => state.trades)
  const setTrades = useTradesStore(state => state.setTrades)
  const locale = useCurrentLocale()
  const t = useI18n()

  // Consolidated effect for carousel and mood data handling
  useEffect(() => {
    if (!api) return

    // Handle carousel selection
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })

    // Handle initial load and mood data
    if (moods) {
      const today = new Date()
      const hasTodayData = moods.some(mood => {
        if (!mood?.day) return false
        const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
        return format(moodDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      })

      // Handle selected date mood data
      const mood = moods.find(mood => {
        if (!mood?.day) return false
        const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
        return format(moodDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      })

      // If it's today and we have data, show summary
      if (isToday(selectedDate) && hasTodayData) {
        // Set data to today's data
        setEmotionValue(mood?.emotionValue ?? 50)
        setSelectedNews(mood?.selectedNews ?? [])
        setJournalContent(mood?.journalContent ?? "")
        setIsEditing(true)
        api.scrollTo(1) // Summary is now index 1
        return
      }

      if (mood) {
        setEmotionValue(mood.emotionValue ?? 50)
        setSelectedNews(mood.selectedNews ?? [])
        setJournalContent(mood.journalContent ?? "")
        api.scrollTo(1) // Summary is now index 1
      } else {
        // Reset all values if no mood data exists for the selected date
        setEmotionValue(0)
        setSelectedNews([])
        setJournalContent("")
      }
    }
  }, [api, selectedDate, moods])

  const handleEmotionChange = (value: number) => {
    setEmotionValue(value)
  }

  const handleNewsSelection = (newsIds: string[]) => {
    setSelectedNews(newsIds)
  }

  const handleJournalChange = (content: string) => {
    setJournalContent(content)
  }

  const handleApplyTagToAll = async (tag: string) => {
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      
      // Find all trades for this day
      const tradesForDay = trades.filter((trade) => tradeMatchesDateKey(trade, dateKey))
      
      const tradeIds = tradesForDay.map(trade => trade.id)
      
      // Update local state immediately for instant feedback
      const updatedTrades = trades.map(trade => {
        if (tradeIds.includes(trade.id)) {
          return {
            ...trade,
            tags: Array.from(new Set([...trade.tags, tag]))
          }
        }
        return trade
      })
      setTrades(updatedTrades)
      
      // Then update on server
      await addTagsToTradesForDay(dateKey, [tag])
      
      toast.success(t('mindset.tags.tagApplied'), {
        description: t('mindset.tags.tagAppliedDescription', { tag }),
      })
    } catch (error) {
      toast.error(t('mindset.tags.tagApplyError'), {
        description: t('mindset.tags.tagApplyErrorDescription'),
      })
    }
  }

  const handleSave = async () => {
    // Scroll to summary view after saving
    api?.scrollTo(1)
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      const savedMood = await saveMindset({
        emotionValue,
        selectedNews,
        journalContent,
      }, dateKey)

      // Update the moodHistory in context
      const updatedMoodHistory = moods?.filter(mood => {
        if (!mood?.day) return true
        const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
        const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
        const moodDateKey = format(moodDate, 'yyyy-MM-dd')
        return moodDateKey !== selectedDateKey
      }) || []
      setMoods([...updatedMoodHistory, savedMood])

      toast.success(t('mindset.saveSuccess'), {
        description: t('mindset.saveSuccessDescription'),
      })

    } catch (error) {
      toast.error(t('mindset.saveError'), {
        description: t('mindset.saveErrorDescription'),
      })
    }
  }

  const handleDeleteEntry = async (date: Date) => {
    try {
      const dateKey = format(date, 'yyyy-MM-dd')
      await deleteMindset(dateKey)

      // Update the moodHistory in context
      const updatedMoodHistory = moods?.filter(mood => {
        if (!mood?.day) return true
        const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
        return format(moodDate, 'yyyy-MM-dd') !== dateKey
      }) || []
      setMoods(updatedMoodHistory)

      // If the deleted entry was the selected date, reset the form
      if (dateKey === format(selectedDate, 'yyyy-MM-dd')) {
        setEmotionValue(50)
        setSelectedNews([])
        setJournalContent("")
        setIsEditing(true)
        api?.scrollTo(0)
      }
    } catch (error) {
      throw error // Let the Timeline component handle the error toast
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    
    // Find if we have data for the selected date
    const moodForDate = moods?.find(mood => {
      if (!mood?.day) return false
      const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
      return format(moodDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })

    if (moodForDate) {
      // If we have data, update all the state values
      console.warn("We have data for the selected date")
      setEmotionValue(moodForDate.emotionValue ?? 50)
      setSelectedNews(moodForDate.selectedNews ?? [])
      setJournalContent(moodForDate.journalContent ?? " ")
      setIsEditing(true)
      api?.scrollTo(1) // Summary is now index 1
    } else {
      // If no data exists, reset the form
      setEmotionValue(50)
      setSelectedNews([])
      setJournalContent("")
      setIsEditing(true)
      api?.scrollTo(0) // Journaling is index 0
    }
  }

  const getEventsForDate = (date: Date): FinancialEvent[] => {
    return financialEvents.filter(event => {
      if (!event.date) return false;
      try {
        const eventDate = new Date(event.date)
        const compareDate = new Date(date)
        
        // Set hours to start of day for comparison
        eventDate.setHours(0, 0, 0, 0)
        compareDate.setHours(0, 0, 0, 0)
        
        return eventDate.getTime() === compareDate.getTime() && event.lang === locale
      } catch (error) {
        console.error('Error parsing event date:', error)
        return false
      }
    })
  }

  const handleEdit = (section?: 'emotion' | 'journal' | 'news') => {
    setIsEditing(true)
    
    // Navigate to the appropriate section
    switch (section) {
      case 'news':
        api?.scrollTo(0) // News is now part of journaling
        break
      case 'journal':
        api?.scrollTo(0)
        break
      case 'emotion':
        api?.scrollTo(0)
        break
      default:
        api?.scrollTo(0)
    }
  }

  const toggleTimeline = () => {
    setIsTimelineVisible(!isTimelineVisible)
  }

  const handleExportAllPdf = async () => {
    if (isExporting) {
      return
    }

    const savedEntries = (moods ?? [])
      .filter((mood) => mood?.day)
      .map((mood) => {
        const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
        return {
          date: format(moodDate, "yyyy-MM-dd"),
          emotionValue: mood.emotionValue ?? 0,
          selectedNewsCount: mood.selectedNews?.length ?? 0,
          journalText: htmlToPlainText(mood.journalContent ?? ""),
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    if (savedEntries.length === 0) {
      toast.error(t("mindset.exportAllPdfNoEntries"))
      return
    }

    try {
      setIsExporting(true)

      const response = await fetch("/api/journal-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          entries: savedEntries,
        }),
      })

      const contentType = response.headers.get("Content-Type")
      if (!response.ok || !contentType?.includes("application/pdf")) {
        throw new Error(`PDF request failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `journal-export-${format(new Date(), "yyyy-MM-dd")}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success(t("mindset.exportAllPdfSuccess"))
    } catch (error) {
      console.error("Failed to export journal PDF:", error)
      toast.error(t("mindset.exportAllPdfError"))
    } finally {
      setIsExporting(false)
    }
  }

  const steps = [
    {
      title: t('mindset.journaling.title'),
      component: <Journaling 
        content={journalContent}
        onChange={handleJournalChange}
        onSave={handleSave}
        emotionValue={emotionValue}
        onEmotionChange={handleEmotionChange}
        date={selectedDate}
        events={getEventsForDate(selectedDate)}
        selectedNews={selectedNews}
        onNewsSelection={handleNewsSelection}
        trades={trades}
        onApplyTagToAll={handleApplyTagToAll}
      />
    },
    {
      title: t('mindset.title'),
      component: <MindsetSummary
        date={selectedDate}
        emotionValue={emotionValue}
        selectedNews={selectedNews}
        journalContent={journalContent}
        onEdit={handleEdit}
      />
    }
  ]

  return (
    <WidgetCard>
      <WidgetHeader
        size={size}
        title={t('mindset.title')}
        description={t('mindset.description')}
        actions={
          <>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleExportAllPdf}
                    disabled={isExporting}
                    aria-label={t("mindset.exportAllPdf")}
                    className="h-7 w-7"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>
                    {isExporting
                      ? t("share.exportPdfInProgress")
                      : t("mindset.exportAllPdf")}
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            {/* Step position as a figure, not a color-only dot row */}
            <span className={cn(widgetType.caption, "tabular-nums")}>
              {formatCount(current + 1, locale)}/{formatCount(steps.length, locale)}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => api?.scrollPrev()}
                disabled={current === 0}
                aria-label={t('mindset.back')}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => api?.scrollNext()}
                disabled={current === steps.length - 1}
                aria-label={t('mindset.next')}
                className="h-7 w-7"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </>
        }
      />
      <WidgetBody size={size} flush className="relative flex flex-row overflow-hidden">
        {/* Timeline, which collapses to give the editor the frame */}
        <div
          className={cn(
            "relative motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out",
            isTimelineVisible ? "w-auto" : "w-0 overflow-hidden"
          )}
        >
          <Timeline 
            className="shrink-0"
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            moodHistory={moods}
            onDeleteEntry={handleDeleteEntry}
          />
          
          {/* Hide/Show Button - positioned at right edge of timeline */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleTimeline}
                    aria-label={isTimelineVisible ? t('mindset.hideTimeline') : t('mindset.showTimeline')}
                    aria-pressed={isTimelineVisible}
                    className="h-8 w-4 rounded-l-md rounded-r-none border-r-0"
                  >
                    {isTimelineVisible ? (
                      <ChevronLeft className="h-3 w-3" aria-hidden />
                    ) : (
                      <ChevronRight className="h-3 w-3" aria-hidden />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{isTimelineVisible ? t('mindset.hideTimeline') : t('mindset.showTimeline')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Show Button when timeline is collapsed */}
        {!isTimelineVisible && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleTimeline}
                    aria-label={t('mindset.showTimeline')}
                    aria-pressed={false}
                    className="h-8 w-4 rounded-l-none rounded-r-md border-l-0"
                  >
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t('mindset.showTimeline')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Carousel */}
        <Carousel
          opts={{
            loop: false,
            watchDrag: (api, event) => {
              // Disable drag on desktop
              if (window.innerWidth >= 768) {
                return false
              }
              return true
            }
          }}
          setApi={setApi}
          className="flex h-full min-w-0 flex-1 flex-col"
        >
          <CarouselContent className="h-full flex-1 pl-4">
            {steps.map((step, index) => (
              <CarouselItem key={index} className="h-full p-4">
                {step.component}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </WidgetBody>
    </WidgetCard>
  )
}
