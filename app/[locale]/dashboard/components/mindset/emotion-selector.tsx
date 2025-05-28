"use client"

import { useState, useEffect } from "react"
import { useI18n } from "@/locales/client"
import { Frown, Smile } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { Tracker } from "@/components/ui/mood-tracker"

interface EmotionSelectorProps {
  value: number
  onChange: (value: number) => void
}

export function EmotionSelector({ value, onChange }: EmotionSelectorProps) {
  const t = useI18n()
  const [localValue, setLocalValue] = useState(value)
  const debouncedLocalValue = useDebounce(localValue, 100)

  // Create 20 steps for granular mood selection
  const moodData = Array.from({ length: 20 }, (_, i) => ({
    key: i,
  }))

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced parent update
  useEffect(() => {
    if (debouncedLocalValue !== value) {
      onChange(debouncedLocalValue)
    }
  }, [debouncedLocalValue, onChange, value])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 w-full">
        <Frown className="h-6 w-6 text-muted-foreground" />
        <Tracker
          data={moodData}
          hoverEffect={true}
          onSelectionChange={(index) => setLocalValue(index * 5)} // Convert 0-19 to 0-95 with steps of 5
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