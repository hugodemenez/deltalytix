'use server'

import { generateText, Output } from "ai"
import { resolveAiTask } from "@/lib/ai/resolve-ai-task"
import { z } from 'zod/v3';
import {
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

    const { output } = await generateText({
      ...resolveAiTask("weekly-recap"),
      output: Output.object({ schema: analysisSchema }),
      prompt: buildWeeklyAnalysisPrompt(sortedTrades, language),
    })

    if (output?.intro && output?.tips) {
      return {
        resultAnalysisIntro: output.intro,
        tipsForNextWeek: output.tips
      }
    }

    return defaultAnalysis
  } catch (error) {
    console.error('Error generating analysis:', error)
    return defaultAnalysis
  }
}
