import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { headers } from 'next/headers'
import TraderStatsEmail from "@/components/emails/weekly-recap"
import MissingYouEmail from "@/components/emails/missing-data"
import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"
import { render, renderAsync } from "@react-email/render"

const prisma = new PrismaClient()

export async function POST(
  req: Request,
  { params }: { params: { userid: string } }
) {
  try {
    // Verify that this is a legitimate request with the correct secret
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: params.userid },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    if (user.language === 'en') {
      return NextResponse.json(
        { error: 'User not french' },
        { status: 404 }
      )
    }

    // get the newsletter config for this user based on email
    const newsletter = await prisma.newsletter.findUnique({
      where: { email: user.email },
    })

    if (!newsletter || !newsletter.isActive) {
      return NextResponse.json(
        { error: `Newsletter subscription not found or inactive for email: ${user.email}` },
        { status: 404 }
      )
    }

    // Ensure URL has protocol
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const apiUrl = baseUrl.startsWith('http') 
      ? baseUrl 
      : `http://${baseUrl}`

    const unsubscribeUrl = `${apiUrl}/api/email/unsubscribe?email=${encodeURIComponent(user.email)}`

    // Get user's trades from last 14 days
    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        entryDate: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
    })

    // If no trades, return missing you email data
    if (trades.length === 0) {
      const missingYouEmailHtml = await render(
        MissingYouEmail({
          firstName: newsletter.firstName || 'trader',
          email: newsletter.email,
        })
      )

      return NextResponse.json({
        success: true,
        emailData: {
          from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
          to: [newsletter.email],
          replyTo: 'hugo.demenez@deltalytix.app',
          subject: 'Nous manquons de vous voir sur Deltalytix',
          html: missingYouEmailHtml
        }
      })
    }

    // Calculate statistics
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
      
      const weekday = (tradeDate.getDay() + 6) % 7
      if (weekday > 4) return acc

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

    const thisWeekPnL = dailyPnL.reduce((sum, day) => sum + day.pnl, 0)
    const profitableDays = dailyPnL.filter(day => day.pnl > 0).length
    const totalDays = dailyPnL.length


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
- PnL total : ${thisWeekPnL}€
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

    const weeklyStatsEmailHtml = await render(
      TraderStatsEmail({
        firstName: newsletter.firstName || 'trader',
        dailyPnL,
        winLossStats,
        email: newsletter.email,
        resultAnalysisIntro: analysis.resultAnalysisIntro,
        tipsForNextWeek: analysis.tipsForNextWeek
      })
    )

    return NextResponse.json({
      success: true,
      emailData: {
        from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
        to: [user.email],
        subject: 'Vos statistiques de trading de la semaine 📈',
        html: weeklyStatsEmailHtml,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        replyTo: 'hugo.demenez@deltalytix.app'
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    )
  }
}
