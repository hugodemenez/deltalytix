"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { NoteEditor } from "@/app/[locale]/dashboard/components/mindset/note-editor"
import { EmotionSelector } from "./emotion-selector"

interface JournalingProps {
  onBack: () => void
  content: string
  onChange: (content: string) => void
  onSave: () => void
  emotionValue: number
  onEmotionChange: (value: number) => void
}

export function Journaling({ 
  onBack, 
  content, 
  onChange, 
  onSave,
  emotionValue,
  onEmotionChange,
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

      <div className="flex-1 min-h-0 mt-6">
        <h3 className="text-sm font-medium mb-2">{t('mindset.journaling.title')}</h3>
        <div className="h-full">
          <NoteEditor
            initialContent={content}
            onChange={onChange}
            height="h-full"
            width="100%"
          />
        </div>
      </div>

      <div className="flex-none flex gap-4 mt-6">
        <Button
          variant="outline"
          onClick={onBack}
        >
          {t('mindset.back')}
        </Button>
        <Button
          onClick={onSave}
        >
          {t('mindset.journaling.save')}
        </Button>
      </div>
    </div>
  )
} 