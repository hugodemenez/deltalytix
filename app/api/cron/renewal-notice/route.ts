import { NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Resend } from 'resend'
import { headers } from 'next/headers'
import { subDays, isEqual, startOfDay } from 'date-fns'
import RenewalNoticeEmail from '@/components/emails/renewal-notice'
import {
  buildRenewalNoticeCopy,
  resolveRenewalNoticeFirstName,
} from '@/lib/renewal-notice-copy'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })
const resend = new Resend(process.env.RESEND_API_KEY)

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.deltalytix.app").replace(
    /\/$/,
    "",
  )
}

// Utility function to calculate next payment date based on frequency
const calculateNextPaymentDate = (currentDate: Date, frequency: string): Date => {
  const nextDate = new Date(currentDate)
  
  switch (frequency) {
    case 'MONTHLY':
    case 'monthly': // Support legacy values during transition
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case 'QUARTERLY':
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    case 'BIANNUAL':
    case 'biannual':
      nextDate.setMonth(nextDate.getMonth() + 6)
      break
    case 'ANNUAL':
    case 'annual':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    case 'CUSTOM':
    case 'custom':
      // For custom frequency, we don't auto-update (user needs to manually set)
      return currentDate
    default:
      // Default to monthly if unknown frequency
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
  }
  
  return nextDate
}

// Daily cron job handler - runs every day at 9 AM UTC
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

    const today = startOfDay(new Date())
    
    // Find all accounts with auto-renewal enabled and valid payment dates
    const accountsWithRenewal = await prisma.account.findMany({
      where: {
        autoRenewal: true,
        nextPaymentDate: {
          not: null
        },
        renewalNotice: {
          not: null,
          gt: 0
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            language: true,
          }
        }
      }
    })

    if (accountsWithRenewal.length === 0) {
      return NextResponse.json(
        { message: 'No accounts with auto-renewal found' },
        { status: 200 }
      )
    }

    // Filter accounts that need renewal notification today
    const accountsToNotify = accountsWithRenewal.filter(account => {
      if (!account.nextPaymentDate || !account.renewalNotice) return false
      
      const notificationDate = startOfDay(subDays(account.nextPaymentDate, account.renewalNotice))
      return isEqual(notificationDate, today)
    })

    if (accountsToNotify.length === 0) {
      return NextResponse.json(
        { message: 'No accounts need renewal notification today' },
        { status: 200 }
      )
    }

    let successCount = 0
    let errorCount = 0
    
    // Group accounts by user to avoid sending multiple emails to the same user
    const userAccountsMap = new Map<string, typeof accountsToNotify>()
    
    accountsToNotify.forEach(account => {
      if (account.user?.email) {
        const existing = userAccountsMap.get(account.user.email) || []
        userAccountsMap.set(account.user.email, [...existing, account])
      }
    })

    const userEmails = [...userAccountsMap.keys()]
    const newsletters = userEmails.length
      ? await prisma.newsletter.findMany({
          where: { email: { in: userEmails } },
          select: { email: true, firstName: true },
        })
      : []
    const firstNameByEmail = new Map(
      newsletters.map((row) => [row.email, row.firstName]),
    )
    const origin = appOrigin()
    const dashboardUrl = `${origin}/dashboard`

    // Send emails to each user
    for (const [userEmail, userAccounts] of userAccountsMap) {
      try {
        const user = userAccounts[0].user!
        const userLanguage = user.language || 'en'
        const userFirstName = resolveRenewalNoticeFirstName(
          firstNameByEmail.get(userEmail),
        )
        
        // If user has multiple accounts expiring, send one email with all accounts
        // For simplicity, we'll send separate emails for each account
        for (const account of userAccounts) {
          try {
            const daysUntilRenewal = account.renewalNotice!
            const nextPaymentDate = account.nextPaymentDate!.toISOString()
            const accountName = account.number || `Account ${account.id}`
            const propFirmName = account.propfirm || 'Unknown Prop Firm'
            const frequency = account.paymentFrequency || 'monthly'
            const copy = buildRenewalNoticeCopy({
              language: userLanguage,
              firstName: userFirstName,
              propFirmName,
              daysUntilRenewal,
            })
            
            const unsubscribeUrl = `${origin}/settings/notifications`

            const { data, error } = await resend.emails.send({
              from: 'Deltalytix Renewals <renewals@eu.updates.deltalytix.app>',
              to: userEmail,
              subject: copy.subject,
              react: RenewalNoticeEmail({
                userFirstName,
                userEmail: userEmail,
                accountName: accountName,
                propFirmName: propFirmName,
                nextPaymentDate,
                daysUntilRenewal: daysUntilRenewal,
                paymentFrequency: frequency,
                language: userLanguage,
                unsubscribeUrl: unsubscribeUrl,
                changeReminderUrl: dashboardUrl,
                turnOffNoticeUrl: dashboardUrl,
              }),
              replyTo: 'hugo.demenez@deltalytix.app',
              headers: {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
              }
            })

            if (error) {
              console.error(`Failed to send renewal notice to ${userEmail} for account ${account.id}:`, error)
              errorCount++
            } else {
              console.log(`Renewal notice sent to ${userEmail} for account ${account.id}`)
              successCount++
              
              // Update the nextPaymentDate to the next cycle (except for custom frequency)
              try {
                if (account.paymentFrequency !== 'CUSTOM' && account.nextPaymentDate) {
                  const newNextPaymentDate = calculateNextPaymentDate(account.nextPaymentDate, account.paymentFrequency || 'MONTHLY')
                  
                  await prisma.account.update({
                    where: { id: account.id },
                    data: { nextPaymentDate: newNextPaymentDate }
                  })
                  
                  console.log(`Updated nextPaymentDate for account ${account.id} from ${account.nextPaymentDate} to ${newNextPaymentDate}`)
                }
              } catch (updateError) {
                console.warn(`Failed to update nextPaymentDate for account ${account.id}:`, updateError)
              }
            }
          } catch (accountError) {
            console.error(`Error processing account ${account.id}:`, accountError)
            errorCount++
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${userEmail}:`, userError)
        errorCount += userAccounts.length
      }
    }

    console.log(`Renewal notice emails processed: ${successCount} successful, ${errorCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Renewal notice emails processed: ${successCount} successful, ${errorCount} failed`,
      stats: { 
        success: successCount, 
        failed: errorCount,
        accountsChecked: accountsWithRenewal.length,
        accountsToNotify: accountsToNotify.length,
        usersNotified: userAccountsMap.size
      }
    })

  } catch (error) {
    console.error('Renewal notice cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 