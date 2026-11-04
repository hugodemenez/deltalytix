export const EMOTION_STEP_COUNT = 5

export const EMOTION_STEP_KEYS = [
  "frustrated",
  "tense",
  "neutral",
  "confident",
  "serene",
] as const

export type EmotionStepKey = (typeof EMOTION_STEP_KEYS)[number]
export type EmotionStep = 1 | 2 | 3 | 4 | 5

const STEP_VALUES = [10, 30, 50, 70, 90] as const

export function emotionValueToStep(value: number): EmotionStep {
  if (value < 20) return 1
  if (value < 40) return 2
  if (value < 60) return 3
  if (value < 80) return 4
  return 5
}

export function stepToEmotionValue(step: EmotionStep): number {
  return STEP_VALUES[step - 1]
}

export function emotionStepFillPercent(step: EmotionStep): number {
  return ((step - 1) / (EMOTION_STEP_COUNT - 1)) * 100
}

export function emotionStepKey(step: EmotionStep): EmotionStepKey {
  return EMOTION_STEP_KEYS[step - 1]
}

export function clampEmotionStep(value: number): EmotionStep {
  const stepped = Math.round(value)
  if (stepped <= 1) return 1
  if (stepped >= 5) return 5
  return stepped as EmotionStep
}
