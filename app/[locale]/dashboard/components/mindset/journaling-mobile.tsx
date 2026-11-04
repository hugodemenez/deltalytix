"use client"

import { DayTagSelector } from "./day-tag-selector"
import { JournalMobileNews } from "./journal-mobile-news"
import { JournalMoodSlider } from "./journal-mood-slider"
import { JournalEditor } from "@/components/journal-editor"
import { FinancialEvent, Trade } from "@/prisma/generated/prisma/browser"
import { useI18n } from "@/locales/client"
import { useState } from "react"

interface JournalingMobileProps {
  content: string
  onChange: (content: string) => void
  onSave: () => Promise<boolean>
  emotionValue: number
  onEmotionChange: (value: number) => void
  date: Date
  events: FinancialEvent[]
  selectedNews: string[]
  onNewsSelection: (newsIds: string[]) => void
  trades: Trade[]
  onApplyTagToAll: (tag: string) => Promise<void>
}

export function JournalingMobile({
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
}: JournalingMobileProps) {
  const t = useI18n()
  const [isWriting, setIsWriting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const saved = await onSave()
      if (saved) {
        setIsWriting(false)
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <JournalMoodSlider
        value={emotionValue}
        onChange={onEmotionChange}
        className="mt-3.5"
      />

      {isWriting ? null : (
        <div className="mt-3">
          <DayTagSelector
            trades={trades}
            date={date}
            onApplyTagToAll={onApplyTagToAll}
            variant="compact"
          />
        </div>
      )}

      <div className="mt-3">
        <JournalEditor
          content={content}
          onChange={onChange}
          placeholder={t("mindset.journaling.dayPlaceholder")}
          width="100%"
          height="auto"
          className="h-auto"
          events={events}
          selectedNews={selectedNews}
          onNewsSelection={onNewsSelection}
          date={date}
          showToolbar={isWriting}
          toolbarVariant="compact"
          onEditingChange={setIsWriting}
          surfaceClassName="p-3 text-base leading-normal"
          commitVisible={isWriting}
          commitDisabled={isSaving}
          onCommit={() => {
            void handleSave()
          }}
        />
      </div>

      <JournalMobileNews events={events} selectedNews={selectedNews} />
    </div>
  )
}
