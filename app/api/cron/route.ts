import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { Resend } from 'resend'
import { headers } from 'next/headers'
import TraderStatsEmail from "@/components/emails/weekly-recap"
import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

// Vercel cron job handler - runs every Sunday at 8 AM UTC+1
export async function GET(req: Request) {
  try {
    // Verify that this is a legitimate Vercel cron job request
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all active subscribers
    const subscribers = await prisma.newsletter.findMany({
      where: { isActive: true },
    })

    if (subscribers.length === 0) {
      return NextResponse.json(
        { message: 'No active subscribers found' },
        { status: 200 }
      )
    }

    // Process subscribers in batches of 100 (Resend's batch limit)
    const batchSize = 100
    const batches = []
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      batches.push(batch)
    }

    let successCount = 0
    let errorCount = 0

    // Process each batch
    for (const batch of batches) {
      try {
        const emailBatch = batch.map(async ({ email, firstName }) => {
          const unsubscribeUrl = `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`
          
          // Get user's trading stats (based on its email address)
          const user = await prisma.user.findUnique({
            where: { email },
          })
          
          let trades = await prisma.trade.findMany({
            where: {
              userId: user?.id,
              // Keep only last 14 days of trades
              entryDate: {
                gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              }
            },
          })

          // Keep only last 14 days of trades
          trades = trades.filter(trade => {
            const tradeDate = new Date(trade.entryDate)
            return tradeDate >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          })
          
          const winLossStats = trades.reduce((acc, trade) => {
            if (trade.pnl > 0) {
              acc.wins++
            } else {
              acc.losses++
            }
            return acc
          }, { wins: 0, losses: 0 })
          
          const dailyPnL = trades.reduce((acc, trade) => {
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

          // Sort by date
          dailyPnL.sort((a, b) => {
            const [dayA, monthA] = a.date.split('/').map(Number)
            const [dayB, monthB] = b.date.split('/').map(Number)
            const currentYear = new Date().getFullYear()
            const dateObjA = new Date(currentYear, monthA - 1, dayA)
            const dateObjB = new Date(currentYear, monthB - 1, dayB)
            return dateObjA.getTime() - dateObjB.getTime()
          })

          // Generate AI analysis
          const DELTALYTIX_CONTEXT = `Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.`

          const analysisSchema = z.object({
            intro: z.string().describe("Une analyse très courte (1 phrase) des performances de la semaine"),
            tips: z.string().describe("Des conseils concis (environ 18 mots) pour améliorer les performances de la semaine prochaine")
          })

          // Calculate metrics for AI analysis
          const thisWeekPnL = dailyPnL.reduce((sum, day) => sum + day.pnl, 0)
          const profitableDays = dailyPnL.filter(day => day.pnl > 0).length
          const totalDays = dailyPnL.length

          const formatPnL = (value: number): string => {
            if (Math.abs(value) >= 1000) {
              return `${(value / 1000).toFixed(1)}K`
            }
            return value.toFixed(Math.abs(value) < 10 ? 2 : 1)
          }

          let analysis = {
            resultAnalysisIntro: "Voici vos statistiques de trading de la semaine.",
            tipsForNextWeek: "Continuez à appliquer votre stratégie avec discipline et à analyser vos trades pour progresser."
          }

          try {
            const { partialObjectStream } = await streamObject({
              model: openai("gpt-4-turbo-preview"),
              schema: analysisSchema,
              prompt: `Tu es un expert en trading qui analyse les performances hebdomadaires des traders.
${DELTALYTIX_CONTEXT}

Ta tâche est de générer deux éléments distincts basés sur ces métriques de trading :

Données de performance :
- PnL total : ${formatPnL(thisWeekPnL)}€
- Jours profitables : ${profitableDays}/${totalDays}

Directives pour l'analyse (intro) :
1. Génère UNE SEULE phrase d'analyse des performances, avec un ton encourageant
2. Sois direct et factuel
3. Mentionne le point le plus important de la semaine
4. Maximum 30 mots concernant l'analyse

Directives pour les conseils (tips) :
1. Suggère une action spécifique utilisant les fonctionnalités de Deltalytix
2. Environ 18 mots
3. Mentionne un outil concret de la plateforme (tableaux de bord, gestion de compte, suivi de challenge, analyses)
4. Relie le conseil aux performances de la semaine
5. Sois précis et actionnable

Génère une analyse personnalisée basée sur ces données :`,
              temperature: 0.7,
            })

            let content = { intro: "", tips: "" }
            for await (const partialObject of partialObjectStream) {
              if (partialObject.intro) content.intro = partialObject.intro
              if (partialObject.tips) content.tips = partialObject.tips
            }

            if (content.intro && content.tips) {
              analysis = {
                resultAnalysisIntro: content.intro,
                tipsForNextWeek: content.tips
              }
            }
          } catch (error) {
            console.error('Error generating analysis:', error)
          }

          return {
            from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
            to: [email],
            subject: 'Vos statistiques de trading de la semaine 📈',
            react: TraderStatsEmail({
              firstName: firstName || 'trader',
              dailyPnL,
              winLossStats,
              email,
              resultAnalysisIntro: analysis.resultAnalysisIntro,
              tipsForNextWeek: analysis.tipsForNextWeek
            }),
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            },
            replyTo: 'hugo.demenez@deltalytix.app'
          }
        })

        const result = await resend.batch.send(await Promise.all(emailBatch))
        successCount += result.data?.data.length || 0
      } catch (error) {
        console.error('Failed to send batch:', error)
        errorCount += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `Weekly email sent successfully to ${successCount} subscribers. Failed: ${errorCount}`,
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
