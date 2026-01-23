"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { EmotionSelector } from "./emotion-selector"
import { DayTagSelector } from "./day-tag-selector"
import { FinancialEvent, Trade } from "@/prisma/generated/prisma/browser"
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
  trades: Trade[]
  onApplyTagToAll: (tag: string) => Promise<void>
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
  trades,
  onApplyTagToAll,
}: JournalingProps) {
  const t = useI18n()

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <h3 className="text-sm font-medium mb-2">{t('mindset.emotion.title')}</h3>
        <EmotionSelector
          value={emotionValue}
          onChange={onEmotionChange}
        />
      </div>

      <div className="flex-none mt-6">
        <DayTagSelector
          trades={trades}
          date={date}
          onApplyTagToAll={onApplyTagToAll}
        />
      </div>

      <div className="flex-1 min-h-0 mt-6 flex flex-col">
          <TiptapEditor
            content={content}
            onChange={onChange}
            placeholder={t('mindset.journaling.placeholder')}
            width="100%"
            height="100%"
            events={events}
            selectedNews={selectedNews}
            onNewsSelection={onNewsSelection}
            date={date}
          />
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