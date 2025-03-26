import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { Resend } from 'resend'
import { headers } from 'next/headers'

// Add route segment config
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

// Vercel cron job handler - runs every Sunday at 8 AM UTC+1
export async function GET(req: Request) {
  try {
    // Verify that this is a legitimate Vercel cron job request
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all users
    const users = await prisma.user.findMany({
    })

    if (users.length === 0) {
      return NextResponse.json(
        { message: 'No users found' },
        { status: 200 }
      )
    }

    // Process subscribers in batches of 100 (Resend's batch limit)
    const batchSize = 100
    const batches = []
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      batches.push(batch)
    }

    let successCount = 0
    let errorCount = 0

    // Process each batch
    for (const batch of batches) {
      try {
        const emailBatch = batch.map(async (user) => {
          if (!user.email) {
            console.warn(`No email found for user: ${user.id}`)
            return null
          }

          // Get email data from the weekly summary endpoint
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/email/weekly-summary/${user.id}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
              }
            }
          )

          if (!response.ok) {
            console.error(`Failed to get email data for user ${user.id}:`, await response.text())
            return null
          }

          const { emailData } = await response.json()
          return emailData
        })

        // Filter out null values and send batch
        const validEmails = (await Promise.all(emailBatch)).filter(Boolean)
        if (validEmails.length > 0) {
          const result = await resend.batch.send(validEmails)
          successCount += result.data?.data.length || 0
          errorCount += batch.length - (result.data?.data.length || 0)
        }
      } catch (error) {
        console.error('Failed to send batch:', error)
        errorCount += batch.length
      }
    }

    console.log(`Weekly emails processed: ${successCount} successful, ${errorCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Weekly emails processed: ${successCount} successful, ${errorCount} failed`,
      stats: { success: successCount, failed: errorCount }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
