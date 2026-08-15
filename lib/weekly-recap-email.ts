import TraderStatsEmail from "@/components/emails/weekly-recap"
import { render } from "@react-email/render"
import { generateTradingAnalysis } from "@/app/api/email/weekly-summary/[userid]/actions/analysis"
import { getUserData, computeTradingStats } from "@/app/api/email/weekly-summary/[userid]/actions/user-data"
import {
  getWeeklyRecapSkipReason,
  type WeeklyRecapSkipReason,
} from "@/lib/weekly-newsletter-window"
import { assertWeeklyRecapRecipient } from "@/lib/weekly-recap-recipient"

export { assertWeeklyRecapRecipient }

export type { WeeklyRecapSkipReason }

export type WeeklyRecapEmailData = {
  from: string
  to: string[]
  subject: string
  html: string
  headers: {
    "List-Unsubscribe": string
    "List-Unsubscribe-Post": string
  }
  replyTo: string
}

export type WeeklyRecapBuildResult =
  | {
      success: true
      emailData: WeeklyRecapEmailData
    }
  | {
      success: true
      emailData: null
      skipped: true
      reason: WeeklyRecapSkipReason
    }

/**
 * Build the weekly recap Resend payload (or skip) for one subscriber.
 * Shared by GET /api/cron and POST /api/email/weekly-summary/[userid]
 * so the Sunday cron never HTTP-self-fetches through a public URL.
 *
 * Loads the same User.id the cron already resolved (trades.userId = User.id).
 * When `expectedEmail` is set, refuses to build if the row does not match.
 *
 * Green-week gate is unchanged: send only if trades exist AND net PnL ≥ 0.
 */
export async function buildWeeklyRecapEmail(
  userId: string,
  expectedEmail?: string,
): Promise<WeeklyRecapBuildResult> {
  const { user, newsletter, trades } = await getUserData(userId)
  if (expectedEmail !== undefined) {
    assertWeeklyRecapRecipient(user, { userId, email: expectedEmail })
  }
  const stats = await computeTradingStats(trades, user.language)

  // CPO gate: no trades or red week (net PnL < 0) → cron drops null emailData.
  // Do not send missing-you / empty-week / consolation mail from this flow.
  const skipReason = getWeeklyRecapSkipReason({
    tradeCount: trades.length,
    netPnL: stats.thisWeekPnL,
  })
  if (skipReason) {
    return {
      success: true,
      emailData: null,
      skipped: true,
      reason: skipReason,
    }
  }

  const analysis = await generateTradingAnalysis(
    stats.dailyPnL,
    user.language as "fr" | "en",
  )

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const apiUrl = baseUrl.startsWith("http") ? baseUrl : `http://${baseUrl}`

  const unsubscribeUrl = `${apiUrl}/api/email/unsubscribe?email=${encodeURIComponent(user.email)}`

  const weeklyStatsEmailHtml = await render(
    TraderStatsEmail({
      firstName: newsletter.firstName || "trader",
      dailyPnL: stats.dailyPnL,
      winLossStats: stats.winLossStats,
      email: newsletter.email,
      resultAnalysisIntro: analysis.resultAnalysisIntro,
      tipsForNextWeek: analysis.tipsForNextWeek,
      language: user.language,
    }),
  )

  return {
    success: true,
    emailData: {
      from: "Deltalytix <newsletter@eu.updates.deltalytix.app>",
      to: [user.email],
      subject:
        user.language === "fr"
          ? "Vos statistiques de trading de la semaine 📈"
          : "Your trading statistics for the week 📈",
      html: weeklyStatsEmailHtml,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      replyTo: '[REDACTED]',
    },
  }
}
