'use server'
import { render } from "@react-email/render"
import TraderStatsEmail from "@/components/emails/weekly-recap"
import { PrismaClient } from "@prisma/client"
import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"

export interface WeeklyRecapContent {
  firstName: string
  dailyPnL: Array<{
    date: string
    pnl: number
    weekday: number
  }>
  winLossStats: {
    wins: number
    losses: number
  }
}

function compareDates(dateA: string, dateB: string) {
  const [dayA, monthA] = dateA.split('/').map(Number)
  const [dayB, monthB] = dateB.split('/').map(Number)
  
  // Create full dates using current year
  const currentYear = new Date().getFullYear()
  const dateObjA = new Date(currentYear, monthA - 1, dayA)
  const dateObjB = new Date(currentYear, monthB - 1, dayB)
  
  return dateObjA.getTime() - dateObjB.getTime()
}

function formatPnL(value: number): string {
  // For values >= 1000 or <= -1000, use K format
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  // For values between -1000 and 1000, show at most 2 decimal places
  return value.toFixed(Math.abs(value) < 10 ? 2 : 1)
}

const DELTALYTIX_CONTEXT = `Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.`

const analysisSchema = z.object({
  intro: z.string().describe("Une analyse très courte (1 phrase) des performances de la semaine"),
  tips: z.string().describe("Des conseils concis (environ 18 mots) pour améliorer les performances de la semaine prochaine")
})

async function generateResultAnalysisIntro(dailyPnL: { date: string, pnl: number, weekday: number }[]) {
  try {
    // Calculate key metrics
    const totalPnL = dailyPnL.reduce((sum, day) => sum + day.pnl, 0)
    const profitableDays = dailyPnL.filter(day => day.pnl > 0).length
    const totalDays = dailyPnL.length
    
    // Sort days by date
    const sortedDays = [...dailyPnL].sort((a, b) => compareDates(a.date, b.date))
    
    // Group days by week using weekday information
    // weekday 0 = Monday, 4 = Friday
    const weeks: Array<typeof sortedDays> = []
    let currentWeek: typeof sortedDays = []
    
    for (const day of sortedDays) {
      if (currentWeek.length === 0 || day.weekday >= currentWeek[currentWeek.length - 1].weekday) {
        currentWeek.push(day)
      } else {
        // If weekday is less than previous day's weekday, it's a new week
        weeks.push(currentWeek)
        currentWeek = [day]
      }
    }
    
    // Add the last week if it exists
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    // Get the last two weeks (if available)
    const thisWeek = weeks[weeks.length - 1] || []
    const lastWeek = weeks[weeks.length - 2] || []
    
    const thisWeekPnL = thisWeek.reduce((sum, day) => sum + day.pnl, 0)
    const lastWeekPnL = lastWeek.reduce((sum, day) => sum + day.pnl, 0)
    const weekOverWeekChange = lastWeekPnL !== 0 
      ? ((thisWeekPnL - lastWeekPnL) / Math.abs(lastWeekPnL)) * 100
      : thisWeekPnL > 0 ? 100 : thisWeekPnL < 0 ? -100 : 0

    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4-turbo-preview"),
      schema: analysisSchema,
      prompt: `Tu es un expert en trading qui analyse les performances hebdomadaires des traders.
${DELTALYTIX_CONTEXT}

Ta tâche est de générer deux éléments distincts basés sur ces métriques de trading :

Données de performance :
- PnL total : ${formatPnL(totalPnL)}€
- Jours profitables : ${profitableDays}/${totalDays}
- PnL cette semaine : ${formatPnL(thisWeekPnL)}€
- PnL semaine précédente : ${formatPnL(lastWeekPnL)}€
- Variation semaine/semaine : ${weekOverWeekChange.toFixed(1)}%

Directives pour l'analyse (intro) :
1. Génère UNE SEULE phrase d'analyse des performances, avec un ton encourageant
2. Sois direct et factuel
3. Mentionne le point le plus important de la semaine
4. Maximum 30 mots

Directives pour les conseils (tips) :
1. Suggère une action spécifique utilisant les fonctionnalités de Deltalytix
2. Environ 18 mots
3. Mentionne un outil concret de la plateforme (tableaux de bord, gestion de compte, suivi de challenge, analyses)
4. Relie le conseil aux performances de la semaine
5. Sois précis et actionnable
6. Exemples de formulation :
   - "Utilisez le tableau de bord X pour analyser..."
   - "Configurez une alerte dans Deltalytix pour..."
   - "Exploitez l'analyse de X dans votre dashboard pour..."
   - "Suivez vos métriques de scalping avec notre outil de..."

Génère une analyse personnalisée basée sur ces données :`,
      temperature: 0.7,
    })

    let content = { intro: "", tips: "" }

    for await (const partialObject of partialObjectStream) {
      if (partialObject.intro) content.intro = partialObject.intro
      if (partialObject.tips) content.tips = partialObject.tips
    }

    return {
      resultAnalysisIntro: content.intro || "Voici vos statistiques de trading de la semaine.",
      tipsForNextWeek: content.tips || "Continuez à appliquer votre stratégie avec discipline et à analyser vos trades pour progresser."
    }
  } catch (error) {
    console.error('Error generating analysis intro:', error)
    return {
      resultAnalysisIntro: "Voici vos statistiques de trading de la semaine.",
      tipsForNextWeek: "Continuez à appliquer votre stratégie avec discipline et à analyser vos trades pour progresser."
    }
  }
}

export async function renderEmailPreview(content: WeeklyRecapContent) {
  try {
    // Sort dailyPnL by date before rendering
    const sortedContent = {
      ...content,
      dailyPnL: [...content.dailyPnL].sort((a, b) => compareDates(a.date, b.date))
    }
    
    const analysis = await generateResultAnalysisIntro(sortedContent.dailyPnL)

    const html = await render(
      TraderStatsEmail({
        firstName: sortedContent.firstName,
        dailyPnL: sortedContent.dailyPnL,
        winLossStats: sortedContent.winLossStats,
        email: "preview@example.com",
        resultAnalysisIntro: analysis.resultAnalysisIntro,
        tipsForNextWeek: analysis.tipsForNextWeek
      })
    )

    return {
      success: true,
      html: `<!DOCTYPE html>
        <html>
          <head>
            <base target="_blank" />
            <style>
              body { margin: 0; padding: 20px; }
              .preview-subject { 
                font-size: 1.25rem; 
                font-weight: 600; 
                margin-bottom: 1rem;
                padding: 0.5rem;
                background-color: #f3f4f6;
                border-radius: 0.375rem;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>`
    }
  } catch (error) {
    console.error("Failed to render email preview:", error)
    return {
      success: false,
      error: "Failed to render email preview",
    }
  }
}

export async function loadInitialContent() {
  const prisma = new PrismaClient()
  const trades = await prisma.trade.findMany({
    where: {
      userId: process.env.ALLOWED_ADMIN_USER_ID,
    },
  })
  
  // Keep the last 14 days of trades to ensure we have two full weeks
  const last14DaysTrades = trades.filter((trade) => {
    const tradeDate = new Date(trade.entryDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - tradeDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 14
  })

  const winLossStats = last14DaysTrades.reduce((acc, trade) => {
    if (trade.pnl > 0) {
      acc.wins++
    } else {
      acc.losses++
    }
    return acc
  }, { wins: 0, losses: 0 })

  const dailyPnL = last14DaysTrades.reduce((acc, trade) => {
    const tradeDate = new Date(trade.entryDate)
    const date = tradeDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    })
    
    // Get weekday (0 = Monday, 4 = Friday)
    const weekday = (tradeDate.getDay() + 6) % 7 // Convert Sunday = 0 to Monday = 0
    if (weekday > 4) return acc // Skip weekends
    
    const existingEntry = acc.find(entry => entry.date === date)
    if (existingEntry) {
      existingEntry.pnl = Number((existingEntry.pnl + trade.pnl - trade.commission).toFixed(2))
    } else {
      acc.push({
        date,
        pnl: Number((trade.pnl - trade.commission).toFixed(2)),
        weekday
      })
    }
    return acc
  }, [] as { date: string, pnl: number, weekday: number }[])

  // Sort by date using the compareDates function
  dailyPnL.sort((a, b) => compareDates(a.date, b.date))

  return {
    firstName: 'Hugo',
    dailyPnL,
    winLossStats,
  }
} 