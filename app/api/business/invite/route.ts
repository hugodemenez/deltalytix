import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { Resend } from 'resend'
import { createClient } from '@/server/auth'
import BusinessInvitationEmail from '@/components/emails/business-invitation'
import { render } from "@react-email/render"

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {

    const { businessId, email, inviterId } = await req.json()

    console.log('Debug - Business ID:', businessId)
    console.log('Debug - Trader Email:', email)
    console.log('Debug - Inviter ID:', inviterId)

    if (!businessId || !email || !inviterId) {
      return NextResponse.json(
        { error: 'Business ID, email, and inviter ID are required' },
        { status: 400 }
      )
    }

    // Check if user is the owner or admin of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    console.log('Debug - Business:', business)

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if user is already a trader in this business
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && business.traderIds.includes(existingUser.id)) {
      return NextResponse.json(
        { error: 'User is already a member of this business' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.businessInvitation.findUnique({
      where: {
        businessId_email: {
          businessId,
          email,
        }
      }
    })

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Create or update invitation
    const invitation = await prisma.businessInvitation.upsert({
      where: {
        businessId_email: {
          businessId,
          email,
        }
      },
      update: {
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedBy: inviterId,
      },
      create: {
        businessId,
        email,
        invitedBy: inviterId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Get inviter information
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
    })

    // Generate join URL
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/business/join?invitation=${invitation.id}`

    // Render email
    const emailHtml = await render(
      BusinessInvitationEmail({
        email,
        businessName: business.name,
        inviterName: inviter?.email?.split('@')[0] || 'trader',
        inviterEmail: inviter?.email || 'trader@example.com',
        joinUrl,
        language: existingUser?.language || 'en'
      })
    )

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Deltalytix Business <business@eu.updates.deltalytix.app>',
      to: email,
      subject: existingUser?.language === 'fr' 
        ? `Invitation à rejoindre ${business.name} sur Deltalytix`
        : `Invitation to join ${business.name} on Deltalytix`,
      html: emailHtml,
      replyTo: 'hugo.demenez@deltalytix.app',
    })

    if (error) {
      console.error('Error sending invitation email:', error)
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, invitationId: invitation.id },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error sending business invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 