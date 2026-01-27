import { NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { Resend } from 'resend'
import { createClient } from '@/server/auth'
import TeamInvitationEmail from '@/components/emails/team-invitation'
import { render } from "@react-email/render"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {

    const { teamId, email, inviterId } = await req.json()

    console.log('Debug - Team ID:', teamId)
    console.log('Debug - Trader Email:', email)
    console.log('Debug - Inviter ID:', inviterId)

    if (!teamId || !email || !inviterId) {
      return NextResponse.json(
        { error: 'Team ID, email, and inviter ID are required' },
        { status: 400 }
      )
    }

    // Check if user is the owner or admin of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    console.log('Debug - Team:', team)

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user is already a trader in this team
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && team.traderIds.includes(existingUser.id)) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.teamInvitation.findUnique({
      where: {
        teamId_email: {
          teamId,
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
    const invitation = await prisma.teamInvitation.upsert({
      where: {
        teamId_email: {
          teamId,
          email,
        }
      },
      update: {
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedBy: inviterId,
      },
      create: {
        teamId,
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
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teams/join?invitation=${invitation.id}`

    // Render email
    const emailHtml = await render(
      TeamInvitationEmail({
        email,
        teamName: team.name,
        inviterName: inviter?.email?.split('@')[0] || 'trader',
        inviterEmail: inviter?.email || 'trader@example.com',
        joinUrl,
        language: existingUser?.language || 'en'
      })
    )

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Deltalytix Team <team@eu.updates.deltalytix.app>',
      to: email,
      subject: existingUser?.language === 'fr' 
        ? `Invitation à rejoindre ${team.name} sur Deltalytix`
        : `Invitation to join ${team.name} on Deltalytix`,
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
    console.error('Error sending team invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 