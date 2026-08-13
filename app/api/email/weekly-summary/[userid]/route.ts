import { NextResponse } from "next/server"
import { headers } from 'next/headers'
import TraderStatsEmail from "@/components/emails/weekly-recap"
import { render } from "@react-email/render"
import { generateTradingAnalysis } from "./actions/analysis"
import { getUserData, computeTradingStats } from "./actions/user-data"
import { shouldSendWeeklyRecap } from "@/lib/weekly-newsletter-window"

export async function POST(req: Request, props: { params: Promise<{ userid: string }> }) {
  const params = await props.params;
  try {
    // Verify that this is a legitimate request with the correct secret
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user data and compute stats for the last complete Mon–Sun UTC week
    const { user, newsletter, trades } = await getUserData(params.userid)
    const stats = await computeTradingStats(trades, user.language)

    // CPO gate: no trades or red week (net PnL < 0) → cron drops null emailData.
    // Do not send missing-you / empty-week / consolation mail from this flow.
    if (
      !shouldSendWeeklyRecap({
        tradeCount: trades.length,
        netPnL: stats.thisWeekPnL,
      })
    ) {
      return NextResponse.json({
        success: true,
        emailData: null,
        skipped: true,
        reason: trades.length === 0 ? "no_trades" : "negative_net_pnl",
      })
    }

    // Generate analysis using server action
    const analysis = await generateTradingAnalysis(
      stats.dailyPnL,
      user.language as 'fr' | 'en'
    )

    // Ensure URL has protocol
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const apiUrl = baseUrl.startsWith('http') 
      ? baseUrl 
      : `http://${baseUrl}`

    const unsubscribeUrl = `${apiUrl}/api/email/unsubscribe?email=${encodeURIComponent(user.email)}`

    const weeklyStatsEmailHtml = await render(
      TraderStatsEmail({
        firstName: newsletter.firstName || 'trader',
        dailyPnL: stats.dailyPnL,
        winLossStats: stats.winLossStats,
        email: newsletter.email,
        resultAnalysisIntro: analysis.resultAnalysisIntro,
        tipsForNextWeek: analysis.tipsForNextWeek,
        language: user.language
      })
    )



    return NextResponse.json({
      success: true,
      emailData: {
        from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
        to: [user.email],
        subject: user.language === 'fr' ? 'Vos statistiques de trading de la semaine 📈' : 'Your trading statistics for the week 📈',
        html: weeklyStatsEmailHtml,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        replyTo: '[REDACTED]'
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
