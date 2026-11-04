"use client"

import { cn } from "@/lib/utils"
import {
  clampEmotionStep,
  EMOTION_STEP_COUNT,
  emotionStepFillPercent,
  emotionStepKey,
  emotionValueToStep,
  stepToEmotionValue,
  type EmotionStep,
} from "@/lib/journal/emotion-steps"
import { useI18n } from "@/locales/client"
import { useId, useState } from "react"

interface JournalMoodSliderProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function JournalMoodSlider({
  value,
  onChange,
  className,
}: JournalMoodSliderProps) {
  const t = useI18n()
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)
  const step = emotionValueToStep(value)
  const label = stepLabel(t, step)
  const fill = emotionStepFillPercent(step)

  const commit = (next: number) => {
    const clamped = clampEmotionStep(next)
    onChange(stepToEmotionValue(clamped))
  }

  return (
    <div
      data-journal-mood={isDragging ? "dragging" : "idle"}
      className={cn(
        "flex items-center gap-2.5 rounded-[10px] border border-border bg-muted px-3 py-2.5",
        isDragging && "border-foreground/20",
        className,
      )}
    >
      <span aria-hidden className="text-base leading-none text-muted-foreground">
        ☹
      </span>
      <div className={cn("relative min-w-0 flex-1", isDragging && "pt-7")}>
        <div className="relative flex h-[22px] items-center">
          <div
            aria-hidden
            className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground/20"
          />
          <div
            aria-hidden
            className="absolute left-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-blue-300"
            style={{ width: fill === 0 ? 0 : `calc(${fill}% - 8px)` }}
          />
          <div
            aria-hidden
            className="relative z-10 flex w-full items-center justify-between px-0.5"
          >
            {Array.from({ length: EMOTION_STEP_COUNT }, (_, index) => {
              const item = (index + 1) as EmotionStep
              const isCurrent = item === step
              const isOn = item <= step
              return (
                <span
                  key={item}
                  className="relative flex h-[22px] w-[22px] items-center justify-center"
                >
                  {isDragging && isCurrent ? (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background">
                      {t("mindset.emotion.stepBubble", {
                        step,
                        label,
                      })}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full border-2 border-muted",
                      isCurrent
                        ? "h-[22px] w-[22px] border-[5px] border-blue-300 bg-background"
                        : isOn
                          ? "h-2.5 w-2.5 bg-blue-300"
                          : "h-2.5 w-2.5 bg-foreground/20",
                    )}
                  />
                </span>
              )
            })}
          </div>
          <input
            id={inputId}
            type="range"
            min={1}
            max={5}
            step={1}
            value={step}
            aria-label={t("mindset.emotion.description")}
            aria-valuetext={t("mindset.emotion.stepBubble", { step, label })}
            className="absolute inset-0 z-20 w-full cursor-pointer opacity-0 touch-none"
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            onPointerCancel={() => setIsDragging(false)}
            onBlur={() => setIsDragging(false)}
            onChange={(event) => commit(Number(event.target.value))}
          />
        </div>
      </div>
      <span aria-hidden className="text-base leading-none text-muted-foreground">
        ☺
      </span>
      <span className="min-w-[44px] text-right text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function stepLabel(
  t: ReturnType<typeof useI18n>,
  step: EmotionStep,
): string {
  switch (emotionStepKey(step)) {
    case "frustrated":
      return t("mindset.emotion.steps.frustrated")
    case "tense":
      return t("mindset.emotion.steps.tense")
    case "neutral":
      return t("mindset.emotion.steps.neutral")
    case "confident":
      return t("mindset.emotion.steps.confident")
    case "serene":
      return t("mindset.emotion.steps.serene")
  }
}
