'use server'

import { streamObject } from "ai"
import { z } from 'zod/v3';
import {
  WEEKLY_ANALYSIS_MODEL,
  WEEKLY_ANALYSIS_REASONING_EFFORT,
  buildWeeklyAnalysisPrompt,
  type DailyPnL,
} from "@/lib/weekly-recap-analysis"

const analysisSchema = z.object({
  intro: z.string().describe("A very short analysis (1 sentence) of the week's performance"),
  tips: z.string().describe("Concise tips (about 18 words) to improve next week's performance")
})

interface AnalysisResult {
  resultAnalysisIntro: string
  tipsForNextWeek: string
}

export async function generateTradingAnalysis(
  dailyPnL: DailyPnL[],
  language: 'fr' | 'en'
): Promise<AnalysisResult> {
  const defaultAnalysis = {
    resultAnalysisIntro: language === 'fr'
      ? "Voici vos statistiques de trading de la semaine."
      : "Here are your trading statistics for the week.",
    tipsForNextWeek: language === 'fr'
      ? "Continuez à appliquer votre stratégie avec discipline et à analyser vos trades pour progresser."
      : "Continue applying your strategy with discipline and analyzing your trades to improve."
  }

  try {
    const sortedTrades = [...dailyPnL].sort((a, b) => a.date.getTime() - b.date.getTime())
    if (sortedTrades.length === 0) {
      return defaultAnalysis
    }

    const { partialObjectStream } = streamObject({
      model: WEEKLY_ANALYSIS_MODEL,
      schema: analysisSchema,
      prompt: buildWeeklyAnalysisPrompt(sortedTrades, language),
      providerOptions: {
        openai: {
          reasoningEffort: WEEKLY_ANALYSIS_REASONING_EFFORT,
        },
      },
    })

    const content = { intro: "", tips: "" }
    for await (const partialObject of partialObjectStream) {
      if (partialObject.intro) content.intro = partialObject.intro
      if (partialObject.tips) content.tips = partialObject.tips
    }

    if (content.intro && content.tips) {
      return {
        resultAnalysisIntro: content.intro,
        tipsForNextWeek: content.tips
      }
    }

    return defaultAnalysis
  } catch (error) {
    console.error('Error generating analysis:', error)
    return defaultAnalysis
  }
}
