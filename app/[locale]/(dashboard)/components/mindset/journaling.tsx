"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { NoteEditor } from "@/app/[locale]/(dashboard)/components/mindset/note-editor"

interface JournalingProps {
  onBack: () => void
  content: string
  onChange: (content: string) => void
  onSave: () => void
  autoSave?: boolean
}

export function Journaling({ onBack, content, onChange, onSave, autoSave = true }: JournalingProps) {
  const t = useI18n()

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <NoteEditor
          onSave={onSave}
          initialContent={content}
          onChange={onChange}
          height="h-96"
          width="100%"
          autoSave={autoSave}
        />
      </div>

      <div className="flex gap-4 mt-4">
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