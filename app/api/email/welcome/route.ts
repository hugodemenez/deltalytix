import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { createClient } from "@/server/auth"
import { Resend } from 'resend'
import WelcomeEmail from '@/components/emails/welcome'
import { render } from '@react-email/render'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    // Verify webhook signature
    const supabase = await createClient()
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    const signature = req.headers.get('x-webhook-signature')

    if (!webhookSecret || !signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      )
    }

    // Get the raw body
    const rawBody = await req.text()
    const payload = JSON.parse(rawBody)

    // Only process new user insertions
    if (payload.type !== 'INSERT') {
      return NextResponse.json(
        { message: 'Ignored event type' },
        { status: 200 }
      )
    }

    const { record } = payload

    // Get the user's first name or use default
    const firstName = record.raw_user_meta_data?.first_name || 'trader'

    // Render the welcome email template
    const emailHtml = await render(WelcomeEmail({ firstName }))

    // Send welcome email
    await resend.emails.send({
      from: 'Deltalytix <welcome@deltalytix.app>',
      to: record.email,
      subject: 'Bienvenue sur Deltalytix',
      html: emailHtml
    })

    return NextResponse.json(
      { message: 'Successfully processed webhook and sent welcome email' },
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

