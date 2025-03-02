import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { headers } from 'next/headers'

const prisma = new PrismaClient()

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

    // Get all users
    const users = await prisma.user.findMany()

    if (users.length === 0) {
      return NextResponse.json(
        { message: 'No users found' },
        { status: 200 }
      )
    }

    // Process all subscribers in parallel
    const results = await Promise.allSettled(
      users.map(async (user) => {
        if (!user.email) {
          console.warn(`No email found for user: ${user.id}`)
          return { status: 'skipped', email: user.email }
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/email/weekly-summary/${user.id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
          }
        )

        const result = await response.json()
        return {
          status: response.ok ? 'fulfilled' : 'rejected',
          email: user.email,
          ...result
        }
      })
    )

    // Calculate statistics
    const stats = results.reduce((acc, result) => {
      if (result.status === 'fulfilled') acc.success++
      else if (result.status === 'rejected') acc.failed++
      else acc.skipped++
      return acc
    }, { success: 0, failed: 0, skipped: 0 })

    return NextResponse.json({
      success: true,
      message: `Weekly emails processed: ${stats.success} successful, ${stats.failed} failed, ${stats.skipped} skipped`,
      stats,
      details: results
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
