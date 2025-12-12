"use server"

import * as React from "react"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { createClient, type User } from "@supabase/supabase-js"
import { render } from "@react-email/render"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export type EmailTemplate =
  | "black-friday"
  | "welcome"
  | "weekly-recap"
  | "new-feature"
  | "renewal-notice"
  | "team-invitation"
  | "missing-data"
  | "support-request"
  | "support-subscription-error"

type TemplateProps = Record<string, unknown>
// Using `any` here keeps template components with specific props assignable
// to a shared type without exploding the union of all template prop shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateComponent = React.ComponentType<any>

async function getEmailTemplate(template: EmailTemplate): Promise<TemplateComponent> {
  switch (template) {
    case "black-friday":
      return (await import("@/components/emails/black-friday")).default as TemplateComponent
    case "welcome":
      return (await import("@/components/emails/welcome")).default as TemplateComponent
    case "weekly-recap":
      return (await import("@/components/emails/weekly-recap")).default as TemplateComponent
    case "new-feature":
      return (await import("@/components/emails/new-feature")).default as TemplateComponent
    case "renewal-notice":
      return (await import("@/components/emails/renewal-notice")).default as TemplateComponent
    case "team-invitation":
      return (await import("@/components/emails/team-invitation")).default as TemplateComponent
    case "missing-data":
      return (await import("@/components/emails/missing-data")).default as TemplateComponent
    case "support-request":
      return (await import("@/components/emails/support-request")).default as TemplateComponent
    case "support-subscription-error":
      return (await import("@/components/emails/support-subscription-error")).default as TemplateComponent
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}

export async function getDefaultTemplateProps(template: EmailTemplate): Promise<TemplateProps> {
  switch (template) {
    case "black-friday":
      return { firstName: "Trader", locale: "fr" }
    case "welcome":
      return {
        firstName: "Trader",
        email: "user@example.com",
        language: "en",
        youtubeId: "ZBrIZpCh_7Q",
      }
    case "weekly-recap":
      return {
        email: "user@example.com",
        firstName: "Trader",
        dailyPnL: [],
        winLossStats: { wins: 0, losses: 0 },
        resultAnalysisIntro: "Sample analysis",
        tipsForNextWeek: "Sample tips",
        language: "en",
      }
    case "new-feature":
      return {
        firstName: "Trader",
        email: "user@example.com",
        youtubeId: "ZBrIZpCh_7Q",
        introMessage: "Sample intro message",
        features: ["Feature 1", "Feature 2"],
        unsubscribeUrl: "https://deltalytix.app/api/email/unsubscribe?email=user%40example.com",
      }
    case "renewal-notice":
      return {
        userFirstName: "Trader",
        userEmail: "user@example.com",
        accountName: "Sample Account",
        propFirmName: "Sample Prop Firm",
        nextPaymentDate: new Date().toISOString(),
        daysUntilRenewal: 7,
        paymentFrequency: "monthly",
        language: "en",
        unsubscribeUrl: "https://deltalytix.app/api/email/unsubscribe?email=user%40example.com",
      }
    case "team-invitation":
      return {
        email: "user@example.com",
        teamName: "Sample Team",
        inviterName: "John Doe",
        inviterEmail: "john@example.com",
        joinUrl: "https://deltalytix.app",
        language: "en",
      }
    case "missing-data":
      return {
        email: "user@example.com",
        firstName: "Trader",
        language: "en",
      }
    case "support-request":
      return {
        locale: "en",
        messages: [],
        summary: "Sample summary",
        contactInfo: {
          name: "John Doe",
          email: "john@example.com",
          additionalInfo: "Sample info",
        },
      }
    case "support-subscription-error":
      return {
        contactInfo: {
          email: "user@example.com",
          additionalInfo: "Sample info",
        },
      }
    default:
      return {}
  }
}

export async function getRequiredTemplateProps(template: EmailTemplate): Promise<string[]> {
  switch (template) {
    case "black-friday":
      return ["firstName"]
    case "welcome":
      return ["firstName", "email", "language", "youtubeId"]
    case "weekly-recap":
      return ["email", "firstName", "dailyPnL", "winLossStats", "resultAnalysisIntro", "tipsForNextWeek"]
    case "new-feature":
      return ["firstName", "email", "youtubeId", "introMessage", "features", "unsubscribeUrl"]
    case "renewal-notice":
      return [
        "userFirstName",
        "userEmail",
        "accountName",
        "propFirmName",
        "nextPaymentDate",
        "daysUntilRenewal",
        "paymentFrequency",
      ]
    case "team-invitation":
      return ["email", "teamName", "inviterName", "inviterEmail", "joinUrl"]
    case "missing-data":
      return ["email", "firstName"]
    case "support-request":
      return ["locale", "messages", "summary", "contactInfo"]
    case "support-subscription-error":
      return ["contactInfo"]
    default:
      return []
  }
}

export async function renderEmailPreview(template: EmailTemplate, props: TemplateProps) {
  try {
    const EmailComponent = await getEmailTemplate(template)
    const html = await render(React.createElement(EmailComponent, props))

    return {
      success: true,
      html: `<!DOCTYPE html>
        <html>
          <head>
            <base target="_blank" />
            <style>
              body { margin: 0; padding: 20px; }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>`,
    }
  } catch (error) {
    console.error("Failed to render email preview:", error)
    return { error: "Failed to render email preview" }
  }
}

interface UserListItem {
  id: string
  email: string
  firstName: string
  language: string
  createdAt: string
}

export async function getUsersList(): Promise<UserListItem[]> {
  try {
    let allUsers: User[] = []
    let page = 1
    const perPage = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })

      if (error) {
        console.error("Error fetching users:", error)
        break
      }

      if (data.users.length === 0) {
        hasMore = false
      } else {
        allUsers = [...allUsers, ...data.users]
        page++
      }
    }

    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        language: true,
      },
    })

    const languageMap = new Map(dbUsers.map((user) => [user.id, user.language]))

    return allUsers.map((user) => {
      const fullName = user.user_metadata?.name || user.user_metadata?.full_name || ""
      const firstName = fullName.split(" ")[0] || ""

      return {
        id: user.id,
        email: user.email || "",
        firstName,
        language: languageMap.get(user.id) || "en",
        createdAt: user.created_at,
      }
    })
  } catch (error) {
    console.error("Error getting users list:", error)
    return []
  }
}

export async function sendEmailsToUsers(
  template: EmailTemplate,
  userIds: string[],
  customProps: TemplateProps,
  subject?: string
) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const EmailComponent = await getEmailTemplate(template)

    const dbUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, language: true },
    })
    const userLanguageMap = new Map(dbUsers.map((user) => [user.id, user.language || "en"]))

    const supabaseBatchSize = 10
    const users: Array<{ id: string; email: string; firstName: string; language: string } | null> = []

    for (let i = 0; i < userIds.length; i += supabaseBatchSize) {
      const batch = userIds.slice(i, i + supabaseBatchSize)
      const batchUsers = await Promise.all(
        batch.map(async (userId) => {
          const { data, error } = await supabase.auth.admin.getUserById(userId)
          if (error || !data.user) return null

          const fullName = data.user.user_metadata?.name || data.user.user_metadata?.full_name || ""
          const firstName = fullName.split(" ")[0] || "trader"

          return {
            id: userId,
            email: data.user.email || "",
            firstName,
            language: userLanguageMap.get(userId) || "en",
          }
        })
      )
      users.push(...batchUsers)
    }

    const validUsers = users.filter((user): user is NonNullable<typeof user> => user !== null)

    if (validUsers.length === 0) {
      return { error: "No valid users found" }
    }

    const batchSize = 100
    const batches: typeof validUsers[] = []

    for (let i = 0; i < validUsers.length; i += batchSize) {
      batches.push(validUsers.slice(i, i + batchSize))
    }

    let successCount = 0
    let errorCount = 0

    for (const batch of batches) {
      try {
        const emailBatch = batch.map((user) => {
          const unsubscribeUrl = `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(user.email)}`
          const mergedProps: TemplateProps = {
            ...customProps,
            firstName: user.firstName,
            email: user.email,
            language: user.language,
            userEmail: user.email,
            userFirstName: user.firstName,
            unsubscribeUrl,
          }

          const emailSubject = subject || getDefaultSubject(template, user.language)

          return {
            from: "Deltalytix <updates@eu.updates.deltalytix.app>",
            to: [user.email],
            subject: emailSubject,
            reply_to: "hugo.demenez@deltalytix.app",
            react: React.createElement(EmailComponent, mergedProps),
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        })

        const result = await resend.batch.send(emailBatch)
        successCount += result.data?.data.length || 0
      } catch (error) {
        console.error("Failed to send batch:", error)
        errorCount += batch.length
      }
    }

    return { success: true, successCount, errorCount, totalUsers: validUsers.length }
  } catch (error) {
    console.error("Failed to send emails:", error)
    return { error: "Failed to send emails" }
  }
}

function getDefaultSubject(template: EmailTemplate, language: string): string {
  const subjects: Record<EmailTemplate, { en: string; fr: string }> = {
    "black-friday": {
      en: "Black Friday: 50€ off Deltalytix Lifetime - Until Nov 30th",
      fr: "Black Friday : 50€ de réduction sur Deltalytix Lifetime - Jusqu'au 30 nov",
    },
    welcome: {
      en: "Welcome to Deltalytix",
      fr: "Bienvenue sur Deltalytix",
    },
    "weekly-recap": {
      en: "Your weekly trading statistics - Deltalytix",
      fr: "Vos statistiques de trading de la semaine - Deltalytix",
    },
    "new-feature": {
      en: "New features on Deltalytix",
      fr: "Nouveautés sur Deltalytix",
    },
    "renewal-notice": {
      en: "Account Renewal Notice",
      fr: "Avis de renouvellement de compte",
    },
    "team-invitation": {
      en: "You've been invited to join a team on Deltalytix",
      fr: "Vous avez été invité à rejoindre une équipe sur Deltalytix",
    },
    "missing-data": {
      en: "We miss seeing you on Deltalytix",
      fr: "Vous nous manquez sur Deltalytix",
    },
    "support-request": {
      en: "New Support Request",
      fr: "Nouvelle demande de support",
    },
    "support-subscription-error": {
      en: "Subscription Error Support",
      fr: "Support erreur d'abonnement",
    },
  }

  const locale = language === "fr" ? "fr" : "en"
  return subjects[template][locale]
}


