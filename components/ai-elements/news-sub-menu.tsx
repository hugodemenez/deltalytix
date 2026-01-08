"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useI18n } from "@/locales/client"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { Newspaper, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { HourlyFinancialTimeline } from "@/app/[locale]/dashboard/components/mindset/hourly-financial-timeline"

interface NewsSubMenuProps {
  events: FinancialEvent[]
  selectedNews: string[]
  onNewsSelection: (newsIds: string[]) => void
  onEmbedNews: (newsIds: string[], action: 'add' | 'remove') => void
  date: Date
  className?: string
}

export function NewsSubMenu({ 
  events, 
  selectedNews, 
  onNewsSelection, 
  onEmbedNews,
  date,
  className 
}: NewsSubMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const t = useI18n()

  const toggleNews = (eventId: string) => {
    const isCurrentlySelected = selectedNews.includes(eventId)
    const newSelectedNews = isCurrentlySelected
      ? selectedNews.filter(id => id !== eventId)
      : [...selectedNews, eventId]
    onNewsSelection(newSelectedNews)
    
    // Auto-embed or remove news based on selection
    if (isCurrentlySelected) {
      // Remove from journal
      onEmbedNews([eventId], 'remove')
    } else {
      // Add to journal
      onEmbedNews([eventId], 'add')
    }
    // Keep popover open after selection
    setIsOpen(true)
  }

  const clearSelection = () => {
    // Remove all selected news from editor
    if (selectedNews.length > 0) {
      onEmbedNews(selectedNews, 'remove')
    }
    onNewsSelection([])
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-3 text-xs font-medium cursor-pointer relative z-0 w-auto justify-center items-center gap-2",
            "bg-background text-foreground border border-border hover:bg-accent",
            "transition-all duration-200 ease-in-out",
            "hover:scale-105 hover:shadow-md",
            "active:scale-95",
            selectedNews.length > 0 && "bg-accent border-accent-foreground/20",
            className
          )}
        >
          <Newspaper className="h-3 w-3" />
          {selectedNews.length > 0 ? (
            <span className="flex items-center gap-1">
              {selectedNews.length}
              {` `}
              {selectedNews.length === 1 ? t('mindset.newsImpact.event') : t('mindset.newsImpact.events')}
            </span>
          ) : (
            <span>{t('mindset.editor.news.title')}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[500px] p-0 z-50"
        align="start"
        side="bottom"
        sideOffset={5}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          // Keep open if interacting with nested popovers/portals (e.g., "More" lists)
          if (
            target?.closest('[data-radix-popover-content]') ||
            target?.closest('[data-radix-popover-trigger]') ||
            target?.closest('[data-radix-portal]')
          ) {
            e.preventDefault()
          }
        }}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">{t('mindset.editor.news.selectNews')}</h3>
            {selectedNews.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer flex items-center gap-1"
                  onClick={clearSelection}
                >
                  {t('mindset.editor.news.selectedCount', { count: selectedNews.length })}
                  <X className="h-3 w-3 opacity-50 hover:opacity-100 transition-opacity" />
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {events.length > 0 ? (
            <HourlyFinancialTimeline
              date={date}
              events={events}
              onEventClick={(event) => toggleNews(event.id)}
              className="h-[400px]"
              selectedEventIds={selectedNews}
              preventScrollPropagation={true}
            />
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('mindset.editor.news.noNews')}
            </div>
          )}
        </div>

      </PopoverContent>
    </Popover>
  )
}
