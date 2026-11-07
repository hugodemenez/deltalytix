"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { JournalingMobile } from "./journaling-mobile"
import { JournalMobileHeader } from "./journal-mobile-header"
import { JournalMobileNews } from "./journal-mobile-news"
import { Timeline } from "./timeline"
import { useI18n } from "@/locales/client"
import { COMPACT_JOURNAL_MEDIA_QUERY } from "@/lib/journal/compact-journal"
import { useLayoutMediaQuery } from "@/hooks/use-media-query"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"
import { toast } from "sonner"
import { saveMindset, deleteMindset } from "@/server/journal"
import { addTagsToTradesForDay } from "@/server/trades"
import { isToday, format } from "date-fns"
import { useMoodStore } from "@/store/widgets/mood-store"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import { useTradesStore } from "@/store/trades-store"
import { useCurrentLocale } from "@/locales/client"
import { tradeMatchesDateKey } from "@/lib/trades/trade-matches-date"
import {
  extractJournalImageSrcs,
  htmlToJournalExportText,
  htmlToPlainText,
} from "@/lib/journal/html-to-plain-text"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { Skeleton } from "@/components/ui/skeleton"

interface MindsetWidgetProps {
  size: WidgetSize
}

export function MindsetWidget({ size }: MindsetWidgetProps) {
  const { calendarData } = useData()
  const [pane, setPane] = useState<"journal" | "summary">("journal")
  const [emotionValue, setEmotionValue] = useState(0)
  const [selectedNews, setSelectedNews] = useState<string[]>([])
  const [journalContent, setJournalContent] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isTimelineVisible, setIsTimelineVisible] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const moods = useMoodStore(state => state.moods)
  const setMoods = useMoodStore(state => state.setMoods)
  const financialEvents = useFinancialEventsStore(state => state.events)
  const trades = useTradesStore(state => state.trades)
  const setTrades = useTradesStore(state => state.setTrades)
  const locale = useCurrentLocale()
  const t = useI18n()
  const [hasMounted, setHasMounted] = useState(false)
  const isCompact = useLayoutMediaQuery(COMPACT_JOURNAL_MEDIA_QUERY)
  const [compactMoodsReady, setCompactMoodsReady] = useState(false)
  const [compactDateKey, setCompactDateKey] = useState(() =>
    format(selectedDate, "yyyy-MM-dd"),
  )
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const findMoodForDate = (date: Date) => {
    return moods?.find(mood => {
      if (!mood?.day) return false
      const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
      return format(moodDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
  }

  const applyMoodToForm = (mood: { emotionValue?: number | null; selectedNews?: string[] | null; journalContent?: string | null } | undefined) => {
    if (mood) {
      setEmotionValue(mood.emotionValue ?? 50)
      setSelectedNews(mood.selectedNews ?? [])
      setJournalContent(mood.journalContent ?? "")
      return
    }
    setEmotionValue(50)
    setSelectedNews([])
    setJournalContent("")
    setPane("journal")
  }

  if (isCompact) {
    const nextDateKey = format(selectedDate, "yyyy-MM-dd")
    if (nextDateKey !== compactDateKey) {
      setCompactDateKey(nextDateKey)
      setCompactMoodsReady(false)
      applyMoodToForm(findMoodForDate(selectedDate))
    } else if (!compactMoodsReady) {
      const mood = findMoodForDate(selectedDate)
      if (mood) {
        setCompactMoodsReady(true)
        if (!journalContent) {
          applyMoodToForm(mood)
        }
      } else if (emotionValue === 0) {
        setEmotionValue(50)
      }
    }
  }

  useEffect(() => {
    if (!moods || isCompact !== false) {
      return
    }

    const hasTodayData = moods.some(mood => {
      if (!mood?.day) return false
      const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
      return format(moodDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    })

    const mood = findMoodForDate(selectedDate)

    if (isToday(selectedDate) && hasTodayData) {
      setEmotionValue(mood?.emotionValue ?? 50)
      setSelectedNews(mood?.selectedNews ?? [])
      setJournalContent(mood?.journalContent ?? "")
      setPane("summary")
      return
    }

    if (mood) {
      setEmotionValue(mood.emotionValue ?? 50)
      setSelectedNews(mood.selectedNews ?? [])
      setJournalContent(mood.journalContent ?? "")
      setPane("summary")
      return
    }

    setEmotionValue(50)
    setSelectedNews([])
    setJournalContent("")
  }, [selectedDate, moods, isCompact])

  const persistMindset = async (overrides?: {
    emotionValue?: number
    journalContent?: string
  }) => {
    const nextEmotion = overrides?.emotionValue ?? emotionValue
    const nextJournal = overrides?.journalContent ?? journalContent
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const savedMood = await saveMindset({
      emotionValue: nextEmotion,
      selectedNews,
      journalContent: nextJournal,
    }, dateKey)

    const updatedMoodHistory = moods?.filter(mood => {
      if (!mood?.day) return true
      const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
      return format(moodDate, 'yyyy-MM-dd') !== dateKey
    }) || []
    setMoods([...updatedMoodHistory, savedMood])
    return savedMood
  }

  const handleEmotionChange = (value: number) => {
    setEmotionValue(value)
    void persistMindset({ emotionValue: value }).catch(() => {
      toast.error(t('mindset.saveError'), {
        description: t('mindset.saveErrorDescription'),
      })
    })
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

  const handleSave = async (): Promise<boolean> => {
    try {
      await persistMindset()

      toast.success(t('mindset.saveSuccess'), {
        description: t('mindset.saveSuccessDescription'),
      })
      return true
    } catch (error) {
      toast.error(t('mindset.saveError'), {
        description: t('mindset.saveErrorDescription'),
      })
      return false
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
        setPane("journal")
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
      setEmotionValue(moodForDate.emotionValue ?? 50)
      setSelectedNews(moodForDate.selectedNews ?? [])
      setJournalContent(moodForDate.journalContent ?? " ")
      setPane("summary")
    } else {
      // If no data exists, reset the form
      setEmotionValue(50)
      setSelectedNews([])
      setJournalContent("")
      setPane("journal")
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

  const toggleTimeline = () => {
    setIsTimelineVisible(!isTimelineVisible)
  }

  const collectSavedMoods = () => {
    return (moods ?? [])
      .filter((mood) => mood?.day)
      .map((mood) => {
        const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
        const html = mood.journalContent ?? ""
        return {
          date: format(moodDate, "yyyy-MM-dd"),
          emotionValue: mood.emotionValue ?? 0,
          selectedNewsCount: mood.selectedNews?.length ?? 0,
          html,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportAllPdf = async () => {
    if (isExporting) {
      return
    }

    const savedEntries = collectSavedMoods().map((entry) => ({
      date: entry.date,
      emotionValue: entry.emotionValue,
      selectedNewsCount: entry.selectedNewsCount,
      journalText: htmlToPlainText(entry.html),
    }))

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

      downloadBlob(await response.blob(), `journal-export-${format(new Date(), "yyyy-MM-dd")}.pdf`)
      toast.success(t("mindset.exportAllPdfSuccess"))
    } catch (error) {
      console.error("Failed to export journal PDF:", error)
      toast.error(t("mindset.exportAllPdfError"))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAllDocx = async () => {
    if (isExporting) {
      return
    }

    const savedEntries = collectSavedMoods().map((entry) => ({
      date: entry.date,
      emotionValue: entry.emotionValue,
      selectedNewsCount: entry.selectedNewsCount,
      journalText: htmlToJournalExportText(entry.html),
      imageUrls: extractJournalImageSrcs(entry.html),
    }))

    if (savedEntries.length === 0) {
      toast.error(t("mindset.exportAllPdfNoEntries"))
      return
    }

    try {
      setIsExporting(true)

      const response = await fetch("/api/journal-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          entries: savedEntries,
        }),
      })

      const contentType = response.headers.get("Content-Type")
      if (
        !response.ok ||
        !contentType?.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
      ) {
        throw new Error(`DOCX request failed with status ${response.status}`)
      }

      downloadBlob(await response.blob(), `journal-export-${format(new Date(), "yyyy-MM-dd")}.docx`)
      toast.success(t("mindset.exportAllDocxSuccess"))
    } catch (error) {
      console.error("Failed to export journal DOCX:", error)
      toast.error(t("mindset.exportAllDocxError"))
    } finally {
      setIsExporting(false)
    }
  }

  if (!hasMounted || isCompact === undefined) {
    return <Skeleton className="h-full min-h-[12rem] w-full rounded-lg" />
  }

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
  const calendarDay = calendarData[selectedDateKey]
  const dayTradeCount = calendarDay?.tradeNumber ?? 0
  const dayPnl = calendarDay?.pnl ?? 0
  const selectedEvents = getEventsForDate(selectedDate)

  if (isCompact) {
    return (
      <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden p-0">
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3.5">
          <div className="flex-none">
            <JournalMobileHeader
              date={selectedDate}
              tradeCount={dayTradeCount}
              dayPnl={dayPnl}
              calendarData={calendarData}
              pane={pane}
              isExporting={isExporting}
              onPaneChange={setPane}
              onDateChange={setSelectedDate}
              onExportPdf={() => {
                void handleExportAllPdf()
              }}
              onExportDocx={() => {
                void handleExportAllDocx()
              }}
            />
          </div>
          <JournalingMobile
            key={selectedDateKey}
            content={journalContent}
            onChange={handleJournalChange}
            onSave={handleSave}
            emotionValue={emotionValue}
            onEmotionChange={handleEmotionChange}
            date={selectedDate}
            events={selectedEvents}
            selectedNews={selectedNews}
            onNewsSelection={handleNewsSelection}
            trades={trades}
            onApplyTagToAll={handleApplyTagToAll}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative flex h-full min-h-0 w-full flex-col overflow-hidden p-0">
      <div
        className={cn(
          "flex-none",
          size === "small" ? "px-3 pt-3" : "px-4 pt-4 sm:px-5 sm:pt-5",
        )}
      >
        <JournalMobileHeader
          variant="desktop"
          date={selectedDate}
          tradeCount={dayTradeCount}
          dayPnl={dayPnl}
          calendarData={calendarData}
          pane={pane}
          isExporting={isExporting}
          onPaneChange={setPane}
          onDateChange={handleDateSelect}
          onExportPdf={() => {
            void handleExportAllPdf()
          }}
          onExportDocx={() => {
            void handleExportAllDocx()
          }}
        />
      </div>
      <CardContent className="relative mt-4 flex min-h-0 flex-1 flex-row overflow-hidden p-0">
        <div
          className={cn(
            "relative flex-none transition-[width] duration-300 ease-out-quart motion-reduce:transition-none",
            isTimelineVisible ? "w-[200px]" : "w-0 overflow-hidden",
          )}
        >
          <Timeline
            className="h-full w-[200px] shrink-0"
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            moodHistory={moods}
            onDeleteEntry={handleDeleteEntry}
            calendarData={calendarData}
          />

          <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleTimeline}
                    className="h-8 w-4 rounded-l-md rounded-r-none border-r-0"
                  >
                    {isTimelineVisible ? (
                      <ChevronLeft className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>
                    {isTimelineVisible
                      ? t("mindset.hideTimeline")
                      : t("mindset.showTimeline")}
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>

        {!isTimelineVisible ? (
          <div className="absolute left-0 top-1/2 z-10 -translate-y-1/2">
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleTimeline}
                    className="h-8 w-4 rounded-l-none rounded-r-md border-l-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t("mindset.showTimeline")}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 gap-6 overflow-hidden",
            size === "small" ? "px-3 pb-3" : "px-4 pb-4 sm:px-5 sm:pb-5",
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-[0_0_58%] flex-col">
            <JournalingMobile
              key={selectedDateKey}
              content={journalContent}
              onChange={handleJournalChange}
              onSave={handleSave}
              emotionValue={emotionValue}
              onEmotionChange={handleEmotionChange}
              date={selectedDate}
              events={selectedEvents}
              selectedNews={selectedNews}
              onNewsSelection={handleNewsSelection}
              trades={trades}
              onApplyTagToAll={handleApplyTagToAll}
              showNews={false}
              growEditor
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border pl-6">
            <JournalMobileNews
              variant="column"
              events={selectedEvents}
              selectedNews={selectedNews}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
