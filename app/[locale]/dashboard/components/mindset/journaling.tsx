"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useI18n } from "@/locales/client"
import { EmotionSelector } from "./emotion-selector"
import { HourlyFinancialTimeline } from "./hourly-financial-timeline"
import { Newspaper, X } from "lucide-react"
import { FinancialEvent } from "@prisma/client"
import { cn } from "@/lib/utils"
import { TiptapEditor } from "@/components/tiptap-editor"

interface JournalingProps {
  content: string
  onChange: (content: string) => void
  onSave: () => void
  emotionValue: number
  onEmotionChange: (value: number) => void
  date: Date
  events: FinancialEvent[]
  selectedNews: string[]
  onNewsSelection: (newsIds: string[]) => void
}

export function Journaling({ 
  content, 
  onChange, 
  onSave,
  emotionValue,
  onEmotionChange,
  date,
  events,
  selectedNews,
  onNewsSelection,
}: JournalingProps) {
  const t = useI18n()

  const toggleNews = (eventId: string) => {
    const newSelectedNews = selectedNews.includes(eventId)
      ? selectedNews.filter(id => id !== eventId)
      : [...selectedNews, eventId]
    onNewsSelection(newSelectedNews)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <h3 className="text-sm font-medium mb-2">{t('mindset.emotion.title')}</h3>
        <EmotionSelector
          value={emotionValue}
          onChange={onEmotionChange}
        />
      </div>

      {/* Events Section */}
      <div className="flex-none mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">{t('mindset.newsImpact.selectImportantNews')}</h3>
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
        </div>
        
        {events.length > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "h-6 px-3 text-xs font-medium cursor-pointer relative z-0 w-auto justify-center items-center gap-2",
                  "bg-background text-foreground border-border hover:bg-accent",
                  "transition-all duration-200 ease-in-out",
                  "hover:scale-105 hover:shadow-md",
                  "active:scale-95"
                )}
              >
                <Newspaper className="h-3 w-3" />
                {events.length} {events.length === 1 ? t('mindset.newsImpact.event') : t('mindset.newsImpact.events')}
              </Badge>
            </PopoverTrigger>
            <PopoverContent
              className="w-[400px] p-0 z-50"
              align="start"
              side="bottom"
              sideOffset={5}
            >
              <HourlyFinancialTimeline
                date={date}
                events={events}
                onEventClick={(event) => toggleNews(event.id)}
                className="h-[400px]"
                selectedEventIds={selectedNews}
                preventScrollPropagation={true}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t('mindset.newsImpact.noEvents')}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 mt-6">
        <h3 className="text-sm font-medium mb-2">{t('mindset.journaling.title')}</h3>
        <div className="h-[200px]">
          <TiptapEditor
            content={content}
            onChange={onChange}
            height="200px"
            placeholder={t('mindset.journaling.placeholder')}
            width="100%"
          />
        </div>
      </div>

      <div className="flex-none flex gap-4 mt-6">
        <Button
          onClick={onSave}
          className="w-full"
        >
          {t('mindset.journaling.save')}
        </Button>
      </div>
    </div>
  )
} 