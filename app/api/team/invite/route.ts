import { render } from "@react-email/render"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { Resend } from 'resend'

import TeamInvitationEmail from '@/components/emails/team-invitation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/server/auth'

// This lives in a Route Handler rather than a server action on purpose: on Next
// 16.3-preview + Turbopack, importing @react-email/render from a 'use server'
// module makes the bundler emit an unresolvable hashed external, which breaks
// *every* action in the same route chunk. Route handlers bundle it correctly.
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { teamId, email } = (body ?? {}) as Record<string, unknown>
    if (typeof teamId !== 'string' || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Team ID and email are required' },
        { status: 400 }
      )
    }
    const traderEmail = email.trim()

    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Only owners and admin managers may invite. The previous version of this
    // route read `inviterId` from the request body and never verified it, so any
    // authenticated caller could invite to any team as anyone.
    const isOwner = team.userId === user.id
    const adminManager = await prisma.teamManager.findUnique({
      where: { teamId_managerId: { teamId, managerId: user.id } },
    })
    if (!isOwner && adminManager?.access !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Unauthorized: Only team owners and admin managers can send invitations',
        },
        { status: 403 }
      )
    }

    const existingInvitation = await prisma.teamInvitation.findUnique({
      where: { teamId_email: { teamId, email: traderEmail } },
    })
    if (existingInvitation?.status === 'PENDING') {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: traderEmail },
    })
    if (existingUser && team.traderIds.includes(existingUser.id)) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      )
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const invitation = await prisma.teamInvitation.upsert({
      where: { teamId_email: { teamId, email: traderEmail } },
      update: { status: 'PENDING', expiresAt, invitedBy: user.id },
      create: {
        teamId,
        email: traderEmail,
        invitedBy: user.id,
        status: 'PENDING',
        expiresAt,
      },
    })

    if (!process.env.RESEND_API_KEY) {
      console.error('[Team invite] RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      )
    }

    const inviter = await prisma.user.findUnique({ where: { id: user.id } })
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://deltalytix.app')
    const joinUrl = `${baseUrl}/teams/join?invitation=${invitation.id}`

    const emailHtml = await render(
      TeamInvitationEmail({
        email: traderEmail,
        teamName: team.name,
        inviterName: inviter?.email?.split('@')[0] || 'trader',
        inviterEmail: inviter?.email || 'trader@example.com',
        joinUrl,
        language: existingUser?.language || 'en',
      })
    )

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailError } = await resend.emails.send({
      from: 'Deltalytix Team <team@eu.updates.deltalytix.app>',
      to: traderEmail,
      subject:
        existingUser?.language === 'fr'
          ? `Invitation à rejoindre ${team.name} sur Deltalytix`
          : `Invitation to join ${team.name} on Deltalytix`,
      html: emailHtml,
      replyTo: 'hugo.demenez@deltalytix.app',
    })

    if (emailError) {
      console.error('[Team invite] Failed to send invitation email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      )
    }

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')

    return NextResponse.json({ success: true, invitationId: invitation.id })
  } catch (error) {
    console.error('[Team invite] Error sending team invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
