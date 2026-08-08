"use client"

import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"
import { Tracker } from "@/components/ui/mood-tracker"
import { widgetType } from "../widgets"

interface EmotionSelectorProps {
  value: number
  onChange: (value: number) => void
}

export function EmotionSelector({ value, onChange }: EmotionSelectorProps) {
  const t = useI18n()

  // 21 steps from 0 to 100 in increments of 5
  const moodData = Array.from({ length: 21 }, (_, i) => ({
    key: i,
  }))

  /*
   * The scale ends are named in words rather than drawn as faces, and the
   * current step is stated as text, so the state never rests on the ramp alone.
   */
  const currentLabel =
    value < 20
      ? t('mindset.emotion.verySad')
      : value < 40
        ? t('mindset.emotion.sad')
        : value < 60
          ? t('mindset.emotion.neutral')
          : value < 80
            ? t('mindset.emotion.happy')
            : t('mindset.emotion.veryHappy')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full items-center gap-3">
        <span className={cn(widgetType.label, "shrink-0")}>
          {t('mindset.emotion.verySad')}
        </span>
        <Tracker
          data={moodData}
          hoverEffect={true}
          defaultBackgroundColor="bg-muted"
          valueIndex={Math.max(0, Math.min(20, Math.round(value / 5)))}
          onSelectionChange={(index) => onChange(index * 5)}
          className="flex-1"
          aria-label={t('mindset.emotion.title')}
        />
        <span className={cn(widgetType.label, "shrink-0")}>
          {t('mindset.emotion.veryHappy')}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={widgetType.value}>{currentLabel}</span>
        <span className={widgetType.caption}>
          {t('mindset.emotion.description')}
        </span>
      </div>
    </div>
  )
}
