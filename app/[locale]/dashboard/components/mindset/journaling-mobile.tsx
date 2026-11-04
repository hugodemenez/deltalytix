"use client"

import { DayTagSelector } from "./day-tag-selector"
import { JournalMoodSlider } from "./journal-mood-slider"
import { JournalMobileSaveBar } from "./journal-mobile-save-bar"
import { JournalEditor } from "@/components/journal-editor"
import { FinancialEvent, Trade } from "@/prisma/generated/prisma/browser"
import { useI18n } from "@/locales/client"
import { useRef, useState } from "react"

interface JournalingMobileProps {
  content: string
  onChange: (content: string) => void
  onSave: () => Promise<boolean>
  onCancel: (snapshot: string) => void
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
  onCancel,
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
  const snapshotRef = useRef(content)

  const handleEditingChange = (editing: boolean) => {
    if (editing && !isWriting) {
      snapshotRef.current = content
    }
    setIsWriting(editing)
  }

  const handleCancel = () => {
    onCancel(snapshotRef.current)
    setIsWriting(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const saved = await onSave()
      if (saved) {
        setIsWriting(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={isWriting ? "flex min-h-0 flex-1 flex-col pb-28" : "flex min-h-0 flex-1 flex-col"}>
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

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <JournalEditor
          content={content}
          onChange={onChange}
          placeholder={t("mindset.journaling.dayPlaceholder")}
          width="100%"
          height="100%"
          events={events}
          selectedNews={selectedNews}
          onNewsSelection={onNewsSelection}
          date={date}
          showToolbar={isWriting}
          toolbarVariant="compact"
          onEditingChange={handleEditingChange}
          surfaceClassName="p-3 text-base leading-normal"
        />
      </div>

      {isWriting ? (
        <JournalMobileSaveBar
          onCancel={handleCancel}
          onSave={() => {
            void handleSave()
          }}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  )
}
