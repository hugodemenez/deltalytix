import { describe, expect, it } from "vitest"
import {
  clampEmotionStep,
  emotionStepFillPercent,
  emotionStepKey,
  emotionValueToStep,
  stepToEmotionValue,
} from "./emotion-steps"

describe("emotion steps", () => {
  it("maps the existing 0–100 bands onto five discrete steps", () => {
    expect(emotionValueToStep(0)).toBe(1)
    expect(emotionValueToStep(19)).toBe(1)
    expect(emotionValueToStep(20)).toBe(2)
    expect(emotionValueToStep(39)).toBe(2)
    expect(emotionValueToStep(50)).toBe(3)
    expect(emotionValueToStep(70)).toBe(4)
    expect(emotionValueToStep(90)).toBe(5)
    expect(emotionValueToStep(100)).toBe(5)
  })

  it("writes steps back into the matching band midpoints", () => {
    expect(stepToEmotionValue(1)).toBe(10)
    expect(stepToEmotionValue(2)).toBe(30)
    expect(stepToEmotionValue(3)).toBe(50)
    expect(stepToEmotionValue(4)).toBe(70)
    expect(stepToEmotionValue(5)).toBe(90)
  })

  it("round-trips each step through the stored emotion value", () => {
    for (const step of [1, 2, 3, 4, 5] as const) {
      expect(emotionValueToStep(stepToEmotionValue(step))).toBe(step)
    }
  })

  it("keeps fill percent aligned with the slider proofs", () => {
    expect(emotionStepFillPercent(1)).toBe(0)
    expect(emotionStepFillPercent(3)).toBe(50)
    expect(emotionStepFillPercent(4)).toBe(75)
    expect(emotionStepFillPercent(5)).toBe(100)
  })

  it("exposes i18n keys in slider order", () => {
    expect(emotionStepKey(1)).toBe("frustrated")
    expect(emotionStepKey(3)).toBe("neutral")
    expect(emotionStepKey(5)).toBe("serene")
  })

  it("clamps raw range values onto 1–5", () => {
    expect(clampEmotionStep(0)).toBe(1)
    expect(clampEmotionStep(3.4)).toBe(3)
    expect(clampEmotionStep(9)).toBe(5)
  })
})
