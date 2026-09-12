import { describe, expect, it } from "vitest"
import {
  WEEKLY_ANALYSIS_MODEL,
  WEEKLY_ANALYSIS_REASONING_EFFORT,
  buildWeeklyAnalysisPrompt,
  formatWeekShapeForPrompt,
  summarizeWeekShape,
} from "./weekly-recap-analysis"

const monday = new Date("2026-08-31T00:00:00.000Z")
const tuesday = new Date("2026-09-01T00:00:00.000Z")
const wednesday = new Date("2026-09-02T00:00:00.000Z")

describe("WEEKLY_ANALYSIS_MODEL", () => {
  it("defaults to GPT-5.6 Luna on the AI Gateway (Luna High)", () => {
    expect(WEEKLY_ANALYSIS_MODEL).toBe("openai/gpt-5.6-luna")
    expect(WEEKLY_ANALYSIS_REASONING_EFFORT).toBe("high")
  })
})

describe("summarizeWeekShape", () => {
  it("marks an empty series", () => {
    expect(summarizeWeekShape([])).toEqual({
      tradingDayCount: 0,
      kind: "empty",
      allowShapeLanguage: false,
    })
  })

  it("marks a one-day week so the model cannot invent a ramp", () => {
    expect(summarizeWeekShape([{ date: monday, pnl: 420 }])).toEqual({
      tradingDayCount: 1,
      kind: "single-day",
      allowShapeLanguage: false,
    })
  })

  it("forbids shape language when two days are flat", () => {
    expect(
      summarizeWeekShape([
        { date: monday, pnl: 100 },
        { date: tuesday, pnl: 100 },
      ]),
    ).toEqual({
      tradingDayCount: 2,
      kind: "flat",
      allowShapeLanguage: false,
    })
  })

  it("allows shape language only when ≥2 days vary", () => {
    expect(
      summarizeWeekShape([
        { date: monday, pnl: 80 },
        { date: tuesday, pnl: 40 },
        { date: wednesday, pnl: 210 },
      ]),
    ).toEqual({
      tradingDayCount: 3,
      kind: "varied",
      allowShapeLanguage: true,
    })
  })
})

describe("formatWeekShapeForPrompt", () => {
  it("states a single-day week in French and bans ramp language", () => {
    const text = formatWeekShapeForPrompt(
      { tradingDayCount: 1, kind: "single-day", allowShapeLanguage: false },
      "fr",
    )
    expect(text).toContain("Jours de trading cette semaine : 1")
    expect(text).toContain("single-day")
    expect(text).toContain("monté en puissance")
    expect(text).toContain("interdit")
  })

  it("states a single-day week in English and bans ramp language", () => {
    const text = formatWeekShapeForPrompt(
      { tradingDayCount: 1, kind: "single-day", allowShapeLanguage: false },
      "en",
    )
    expect(text).toContain("Trading days this week: 1")
    expect(text).toContain("single-day")
    expect(text).toContain("started soft then climbed")
    expect(text).toContain("forbidden")
  })
})

describe("buildWeeklyAnalysisPrompt", () => {
  const oneDay = [{ date: monday, pnl: 275.5 }]
  const variedDays = [
    { date: monday, pnl: 40 },
    { date: tuesday, pnl: 180 },
  ]

  it("writes FR rules that block 1-day ramps and vague fluff", () => {
    const prompt = buildWeeklyAnalysisPrompt(oneDay, "fr")
    expect(prompt).toContain("Jours de trading cette semaine : 1")
    expect(prompt).toContain("une séance / un jour")
    expect(prompt).toContain("commencé doucement")
    expect(prompt).toContain("monté en puissance")
    expect(prompt).toContain("énergie positive")
    expect(prompt).toContain("jusqu'à 60 mots")
    expect(prompt).toContain("jusqu'à 36 mots")
    expect(prompt).toContain("tableau de bord")
    expect(prompt).not.toContain("toujours positif")
    expect(prompt).not.toContain("Trouve toujours quelque chose de positif")
    expect(prompt).toContain("275.5€")
  })

  it("writes EN rules that block 1-day ramps and vague fluff", () => {
    const prompt = buildWeeklyAnalysisPrompt(oneDay, "en")
    expect(prompt).toContain("Trading days this week: 1")
    expect(prompt).toContain("one session / one day")
    expect(prompt).toContain("started soft")
    expect(prompt).toContain("ramped up")
    expect(prompt).toContain("positive energy")
    expect(prompt).toContain("up to 60 words")
    expect(prompt).toContain("up to 36 words")
    expect(prompt).toContain("dashboard")
    expect(prompt).not.toContain("always positive")
    expect(prompt).not.toContain("Always find something positive")
    expect(prompt).toContain("275.5€")
  })

  it("allows day-to-day language only for a varied multi-day series", () => {
    const fr = buildWeeklyAnalysisPrompt(variedDays, "fr")
    const en = buildWeeklyAnalysisPrompt(variedDays, "en")
    expect(fr).toContain("Jours de trading cette semaine : 2")
    expect(fr).toContain("varied")
    expect(fr).toContain("autorisé uniquement si les chiffres du jour le montrent")
    expect(en).toContain("Trading days this week: 2")
    expect(en).toContain("allowed only when the daily numbers support it")
  })

  it("does not ask the model to compare a previous week that is not in the data", () => {
    const prompt = buildWeeklyAnalysisPrompt(oneDay, "fr")
    expect(prompt).toContain("il n'y a pas de série de la semaine précédente")
    expect(prompt).not.toContain("Compare avec la semaine précédente")
    expect(prompt).not.toContain("tendances sur les deux semaines")
  })
})
