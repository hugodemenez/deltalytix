'use server'

import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from 'zod/v3';

const DELTALYTIX_CONTEXT = {
  fr: `Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.`,
  en: `Deltalytix is a web platform for futures day traders, featuring an intuitive and customizable interface. Designed from my personal experience as a futures day trader using scalping strategies, it offers features like multiple account management, propfirm challenge tracking, and customizable dashboards. Our goal is to provide traders with in-depth analysis of their trading habits to optimize their strategies and improve decision-making.`
}

const analysisSchema = z.object({
  intro: z.string().describe("A very short analysis (1 sentence) of the week's performance"),
  tips: z.string().describe("Concise tips (about 18 words) to improve next week's performance")
})

interface AnalysisResult {
  resultAnalysisIntro: string
  tipsForNextWeek: string
}

interface DailyPnL {
  date: Date
  pnl: number
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
    // Sort trades by date
    const sortedTrades = [...dailyPnL].sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Group trades by week
    const tradesByWeek = sortedTrades.reduce((acc, trade) => {
      const weekNumber = getWeekNumber(trade.date)
      if (!acc[weekNumber]) {
        acc[weekNumber] = []
      }
      acc[weekNumber].push(trade)
      return acc
    }, {} as Record<number, DailyPnL[]>)

    // Get the two most recent weeks
    const weekNumbers = Object.keys(tradesByWeek).map(Number).sort((a, b) => b - a)
    const lastTwoWeeks = weekNumbers.slice(0, 2).map(weekNum => tradesByWeek[weekNum])

    const { partialObjectStream } = streamObject({
      model: openai("gpt-4.1-nano-2025-04-14"),
      schema: analysisSchema,
      prompt: language === 'fr'
        ? `Tu es un coach en trading qui aide les traders à progresser. Tu es toujours positif et encourageant.
${DELTALYTIX_CONTEXT.fr}

Voici les résultats de trading des deux dernières semaines :

Données de performance journalières :
${lastTwoWeeks.map((week, index) => {
  const isCurrentWeek = index === 0;
  const weekLabel = isCurrentWeek ? 'Semaine en cours' : 'Semaine précédente';
  return `${weekLabel}:\n${week.map(day => 
    `- ${day.date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}: ${day.pnl}€`
  ).join('\n')}`
}).join('\n\n')}

Pour l'analyse (intro) :
1. Fais une phrase simple qui explique comment s'est passée la semaine en cours
2. Trouve toujours quelque chose de positif à dire, même si c'est petit
3. Parle comme à un ami, avec des mots simples
4. Tu peux faire jusqu'à 60 mots
5. Regarde comment les résultats changent chaque jour
6. Dis ce qui va bien et ce qui peut être amélioré, mais toujours gentiment
7. Compare avec la semaine précédente si possible
8. Prends en compte le jour de la semaine pour l'analyse
9. Mets l'accent sur la semaine en cours, en utilisant la semaine précédente comme point de référence

Pour les conseils (tips) :
1. Donne un conseil simple et facile à suivre
2. Tu peux faire jusqu'à 36 mots
3. Parle d'un outil de Deltalytix qui peut aider
4. Explique comment ce conseil peut aider à faire mieux
5. Sois précis sur ce qu'il faut faire
6. Regarde les bons et les moins bons jours pour donner un conseil utile
7. Dis les choses de façon positive, comme une chance de s'améliorer
8. Utilise des mots simples et clairs
9. Prends en compte les tendances sur les deux semaines
10. Concentre-toi sur les améliorations possibles pour la semaine à venir

Fais une analyse qui aide le trader à progresser :`
        : `You are a trading coach who helps traders improve. You are always positive and encouraging.
${DELTALYTIX_CONTEXT.en}

Here are the trading results for the last two weeks:

Daily performance data:
${lastTwoWeeks.map((week, index) => {
  const isCurrentWeek = index === 0;
  const weekLabel = isCurrentWeek ? 'Current Week' : 'Previous Week';
  return `${weekLabel}:\n${week.map(day => 
    `- ${day.date.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long' })}: ${day.pnl}€`
  ).join('\n')}`
}).join('\n\n')}

For the analysis (intro):
1. Write a simple sentence explaining how the current week went
2. Always find something positive to say, even if it's small
3. Speak like you're talking to a friend, using simple words
4. You can use up to 60 words
5. Look at how the results change each day
6. Say what's working well and what can be better, but always kindly
7. Compare with the previous week if possible
8. Take into account the day of the week for analysis
9. Focus on the current week, using the previous week as a reference point

For the tips:
1. Give a simple and easy-to-follow tip
2. You can use up to 36 words
3. Talk about a Deltalytix tool that can help
4. Explain how this tip can help do better
5. Be specific about what to do
6. Look at the good and not-so-good days to give useful advice
7. Say things in a positive way, like a chance to improve
8. Use simple and clear words
9. Take into account trends over the two weeks
10. Focus on possible improvements for the upcoming week

Write an analysis that helps the trader improve:`,
      temperature: 0.7,
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

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}
