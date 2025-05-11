"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useI18n } from "@/locales/client"
import { Frown, Smile } from "lucide-react"

interface EmotionSelectorProps {
  onNext: () => void
  onBack: () => void
  value: number
  onChange: (value: number) => void
}

export function EmotionSelector({ onNext, onBack, value, onChange }: EmotionSelectorProps) {
  const t = useI18n()

  const getEmotionLabel = (value: number) => {
    if (value < 20) return t('mindset.emotion.verySad')
    if (value < 40) return t('mindset.emotion.sad')
    if (value < 60) return t('mindset.emotion.neutral')
    if (value < 80) return t('mindset.emotion.happy')
    return t('mindset.emotion.veryHappy')
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 px-4">
      <div className="flex items-center gap-4 w-full max-w-md">
        <Frown className="h-6 w-6 text-muted-foreground" />
        <Slider
          value={[value]}
          onValueChange={([newValue]) => onChange(newValue)}
          max={100}
          step={1}
          className="flex-1"
        />
        <Smile className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <div className="text-center">
        <p className="text-2xl font-semibold mb-2">
          {getEmotionLabel(value)}
        </p>
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