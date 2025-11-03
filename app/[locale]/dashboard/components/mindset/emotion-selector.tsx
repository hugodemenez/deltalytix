"use client"

import { useI18n } from "@/locales/client"
import { Frown, Smile } from "lucide-react"
import { Tracker } from "@/components/ui/mood-tracker"

interface EmotionSelectorProps {
  value: number
  onChange: (value: number) => void
}

export function EmotionSelector({ value, onChange }: EmotionSelectorProps) {
  const t = useI18n()

  // Create 20 steps for granular mood selection
  const moodData = Array.from({ length: 20 }, (_, i) => ({
    key: i,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 w-full">
        <Frown className="h-6 w-6 text-muted-foreground" />
        <Tracker
          data={moodData}
          hoverEffect={true}
          valueIndex={Math.max(0, Math.min(19, Math.round(value / 5)))}
          onSelectionChange={(index) => onChange(index * 5)} // Convert 0-19 to 0-95 with steps of 5
          className="flex-1"
        />
        <Smile className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <p className="text-sm text-muted-foreground">
        {t('mindset.emotion.description')}
      </p>
    </div>
  )
} 