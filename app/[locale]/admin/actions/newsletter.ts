"use server"

import { PrismaClient, User } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { Resend } from 'resend'
import NewsletterEmail from '@/components/emails/new-feature'
import { revalidatePath } from "next/cache"
import { parse } from "csv-parse"
import { render } from "@react-email/render"

// Initialize PrismaClient outside of the actions
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

interface SendNewsletterParams {
  subject: string
  youtubeId: string
  introMessage: string
  features: string[]
  firstName: string
}

export async function getSubscribers() {
  try {
    const subscribers = await prisma.newsletter.findMany({
      select: {
        email: true,
        isActive: true,
        firstName: true,
        lastName: true
      },
    })
    return { subscribers }
  } catch (error) {
    console.error("Failed to fetch subscribers:", error)
    return { error: "Failed to fetch subscribers" }
  }
}

export async function deleteSubscriber(email: string) {
  try {
    await prisma.newsletter.delete({
      where: { email }
    })
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete subscriber:", error)
    return { error: "Failed to delete subscriber" }
  }
}

export async function importSubscribers(file: File) {
  try {
    const text = await file.text()
    const records: Record<string, string>[] = await new Promise((resolve, reject) => {
      parse(text, {
        skip_empty_lines: true,
        trim: true,
        columns: true // Enable header row parsing
      }, (error: Error | undefined, records: Record<string, string>[]) => {
        if (error) reject(error)
        else resolve(records)
      })
    })

    // Extract emails from the records
    const emails = records
      .map(record => record.email)
      .filter(Boolean) // Remove any undefined or empty values
    
    // Filter out invalid emails
    const validEmails = emails.filter(email => {
      return email && email.includes("@") && email.includes(".")
    })

    // Batch upsert subscribers
    await prisma.$transaction(
      validEmails.map(email =>
        prisma.newsletter.upsert({
          where: { email },
          update: { isActive: true },
          create: {
            email,
            isActive: true
          }
        })
      )
    )

    revalidatePath('/admin')
    return { success: true, count: validEmails.length }
  } catch (error) {
    console.error("Failed to import subscribers:", error)
    return { error: "Failed to import subscribers" }
  }
}

export async function sendNewsletter({
  subject,
  youtubeId,
  introMessage,
  features,
}: SendNewsletterParams) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    const resend = new Resend(process.env.RESEND_API_KEY)

    // get all users
    const users = await prisma.user.findMany()

    // For all french users, check if they are subscribed to the newsletter
    const frenchUsers = users.filter((user: User) => user.language === 'fr')
    const subscribers = await prisma.newsletter.findMany({
      where: { email: { in: frenchUsers.map((user: User) => user.email) }, isActive: true },
    })
    


    if (subscribers.length === 0) {
      return { error: "No active subscribers found" }
    }

    // Send emails in batches of 100 (Resend's batch limit)
    const batchSize = 100
    const batches: typeof subscribers[] = []
    
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      batches.push(batch)
    }

    let successCount = 0
    let errorCount = 0

    // Process each batch
    for (const batch of batches) {
      try {
        const emailBatch = batch.map(({ email, firstName }) => {
          const unsubscribeUrl = `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`
          
          return {
            from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
            to: [email],
            subject,
            reply_to: 'hugo.demenez@deltalytix.app',
            react: NewsletterEmail({ 
              youtubeId, 
              introMessage, 
              features,
              email,
              firstName: firstName || '',
              unsubscribeUrl
            }),
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
          }
        })

        const result = await resend.batch.send(emailBatch)
        successCount += result.data?.data.length || 0
      } catch (error) {
        console.error('Failed to send batch:', error)
        errorCount += batch.length
      }
    }

    return {
      success: true,
      successCount,
      errorCount
    }

  } catch (error) {
    console.error("Failed to send newsletter:", error)
    return { error: "Failed to send newsletter" }
  }
}

  
export async function sendTestNewsletter(email: string, firstName: string, params: SendNewsletterParams) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    const resend = new Resend(process.env.RESEND_API_KEY)

    const unsubscribeUrl = `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`

    await resend.emails.send({
      from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
      to: email,
      subject: `[TEST] ${params.subject}`,
      react: NewsletterEmail({ 
        youtubeId: params.youtubeId,
        introMessage: params.introMessage,
        features: params.features,
        email,
        firstName: params.firstName,
        unsubscribeUrl
      }),
      replyTo: 'hugo.demenez@deltalytix.app',
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to send test newsletter:", error)
    return { error: "Failed to send test newsletter" }
  }
}

export async function renderEmailPreview(params: {
  youtubeId: string
  introMessage: string
  features: string[]
  firstName: string
  subject?: string
}) {
  try {
    const html = await render(
      NewsletterEmail({
        youtubeId: params.youtubeId,
        introMessage: params.introMessage,
        features: params.features,
        email: "preview@example.com",
        firstName: params.firstName,
        unsubscribeUrl: `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent("preview@example.com")}`
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
            ${params.subject ? `<div class="preview-subject">Subject: ${params.subject}</div>` : ''}
            ${html}
          </body>
        </html>`
    }
  } catch (error) {
    console.error("Failed to render email preview:", error)
    return { error: "Failed to render email preview" }
  }
} 