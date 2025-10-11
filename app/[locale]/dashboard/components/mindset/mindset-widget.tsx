"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { Journaling } from "./journaling"
import { Timeline } from "./timeline"
import { MindsetSummary } from "./mindset-summary"
import { useI18n } from "@/locales/client"
import { Info, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"
import type { EmblaCarouselType as CarouselApi } from "embla-carousel"
import { toast } from "@/hooks/use-toast"
import { saveMindset, deleteMindset } from "@/server/journal"
import { isToday, format } from "date-fns"
import { useMoodStore } from "@/store/mood-store"
import { useFinancialEventsStore } from "@/store/financial-events-store"
import { useCurrentLocale } from "@/locales/client"
import { FinancialEvent } from "@prisma/client"

interface MindsetWidgetProps {
  size: WidgetSize
}

export function MindsetWidget({ size }: MindsetWidgetProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [emotionValue, setEmotionValue] = useState(50)
  const [selectedNews, setSelectedNews] = useState<string[]>([])
  const [journalContent, setJournalContent] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isEditing, setIsEditing] = useState(true)
  const moods = useMoodStore(state => state.moods)
  const setMoods = useMoodStore(state => state.setMoods)
  const financialEvents = useFinancialEventsStore(state => state.events)
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
        setEmotionValue(50)
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

      toast({
        title: t('mindset.saveSuccess'),
        description: t('mindset.saveSuccessDescription'),
      })

    } catch (error) {
      toast({
        title: t('mindset.saveError'),
        description: t('mindset.saveErrorDescription'),
        variant: "destructive",
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
      setEmotionValue(moodForDate.emotionValue ?? 50)
      setSelectedNews(moodForDate.selectedNews ?? [])
      setJournalContent(moodForDate.journalContent ?? "")
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
    <Card className="flex flex-col p-0 h-full w-full">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              {t('mindset.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('mindset.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    current === index
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => api?.scrollPrev()}
                disabled={current === 0}
                className="h-6 w-6"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => api?.scrollNext()}
                disabled={current === steps.length - 1}
                className="h-6 w-6"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-row gap-4">
        <Timeline 
          className="flex-shrink-0"
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          moodHistory={moods}
          onDeleteEntry={handleDeleteEntry}
        />
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
          className="flex-1 min-w-0 h-full flex flex-col"
        >
          <CarouselContent className="h-full flex-1">
            {steps.map((step, index) => (
              <CarouselItem key={index} className="h-full p-4">
                {step.component}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </CardContent>
    </Card>
  )
} 