"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useI18n } from "@/locales/client"
import { Frown, Smile } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface EmotionSelectorProps {
  onNext: () => void
  onBack: () => void
  value: number
  onChange: (value: number) => void
}

export function EmotionSelector({ onNext, onBack, value, onChange }: EmotionSelectorProps) {
  const t = useI18n()
  const [localValue, setLocalValue] = useState(value)
  const debouncedLocalValue = useDebounce(localValue, 100)

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
    <div className="h-full flex flex-col items-center justify-center gap-8 px-4">
      <div className="flex items-center gap-4 w-full max-w-md">
        <Frown className="h-6 w-6 text-muted-foreground" />
        <Slider
          value={[localValue]}
          onValueChange={([newValue]) => setLocalValue(newValue)}
          max={100}
          step={1}
          className="flex-1"
        />
        <Smile className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <div className="text-center">
        <p className="text-muted-foreground">
          {t('mindset.emotion.description')}
        </p>
      </div>

      <div className="flex gap-4 mt-4">
        <Button
          variant="outline"
          onClick={onBack}
        >
          {t('mindset.back')}
        </Button>
        <Button
          onClick={onNext}
        >
          {t('mindset.next')}
        </Button>
      </div>
    </div>
  )
} 