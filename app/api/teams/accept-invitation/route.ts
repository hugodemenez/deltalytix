import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { createClient } from '@/server/auth'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { invitationId } = await req.json()

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Find the invitation
    const invitation = await prisma.businessInvitation.findUnique({
      where: { id: invitationId },
      include: { team: true }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation has already been used or expired' },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if the email matches the current user
    if (invitation.email !== user.email) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    // Add user to the team
    const updatedTraderIds = [...invitation.team.traderIds, user.id]

    await prisma.team.update({
      where: { id: invitation.teamId },
      data: {
        traderIds: updatedTraderIds,
      },
    })

    // Update invitation status
    await prisma.businessInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
      },
    })

    return NextResponse.json(
      { success: true, teamId: invitation.teamId },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error accepting team invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 