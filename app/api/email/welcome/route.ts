import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { createClient } from "@/server/auth"
import { Resend } from 'resend'

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


    // Send welcome email
    await resend.emails.send({
      from: 'Trade Optimizer <welcome@tradeoptimizerlt.com>',
      to: record.email,
      subject: 'Welcome to Trade Optimizer',
      html: `
        <h1>Welcome to Trade Optimizer!</h1>
        <p>We're excited to have you on board.</p>
        <p>Get started by importing your first trades and analyzing your performance.</p>
        <p>If you have any questions, feel free to reply to this email.</p>
      `
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

