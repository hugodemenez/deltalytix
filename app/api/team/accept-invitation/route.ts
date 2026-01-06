import { NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { createClient } from '@/server/auth'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

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
    const invitation = await prisma.teamInvitation.findUnique({
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
    await prisma.teamInvitation.update({
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