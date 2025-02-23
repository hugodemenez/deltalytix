import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { createClient } from "@/server/auth"
import { Resend } from 'resend'
import WelcomeEmail from '@/components/emails/welcome'
import { render } from '@react-email/render'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  try {
    const payload = await req.json()

    // Only process new user insertions
    if (payload.type !== 'INSERT') {
      return NextResponse.json(
        { message: 'Ignored event type' },
        { status: 200 }
      )
    }

    const { record } = payload
    console.log(record)

    // Get the user's first name or use default
    const fullName = record.raw_user_meta_data?.name || record.raw_user_meta_data?.full_name || ''
    const firstName = fullName.split(' ')[0] || 'trader'

    // Add email to newsletter list
    await prisma.newsletter.upsert({
      where: { email: record.email },
      update: { isActive: true },
      create: {
        email: record.email,
        isActive: true
      }
    })

    const unsubscribeUrl = `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(record.email)}`

    // Use react prop instead of rendering to HTML
    const { data, error } = await resend.emails.send({
      from: 'Deltalytix <welcome@deltalytix.app>',
      to: record.email,
      subject: 'Bienvenue sur Deltalytix',
      react: WelcomeEmail({ firstName, email: record.email }),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      },
      scheduledAt: fifteenMinutesFromNow
    })

    if (error) {
      console.error('Email error:', error)
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Successfully processed webhook and sent welcome email', data },
      { status: 200 }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

