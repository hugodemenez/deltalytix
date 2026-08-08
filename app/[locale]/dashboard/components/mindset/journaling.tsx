"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { EmotionSelector } from "./emotion-selector"
import { DayTagSelector } from "./day-tag-selector"
import { FinancialEvent, Trade } from "@/prisma/generated/prisma/browser"
import { TiptapEditor } from "@/components/tiptap-editor"
import { widgetType } from "../widgets"

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

  /* Groups are separated by spacing, not by a box each. */
  return (
    <div className="flex h-full flex-col gap-6">
      <section className="flex flex-none flex-col gap-2">
        <h3 className={widgetType.section}>{t("mindset.emotion.title")}</h3>
        <EmotionSelector value={emotionValue} onChange={onEmotionChange} />
      </section>

      <div className="flex-none">
        <DayTagSelector trades={trades} date={date} onApplyTagToAll={onApplyTagToAll} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <TiptapEditor
          content={content}
          onChange={onChange}
          placeholder={t("mindset.journaling.placeholder")}
          width="100%"
          height="100%"
          events={events}
          selectedNews={selectedNews}
          onNewsSelection={onNewsSelection}
          date={date}
        />
      </div>

      <div className="flex flex-none gap-4">
        <Button onClick={onSave} className="w-full">
          {t("mindset.journaling.save")}
        </Button>
      </div>
    </div>
  )
}
