'use server'

import { prisma } from '@/lib/prisma'
import auth from '@/locales/en/auth'
import { createClient } from '@/server/auth'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import TeamInvitationEmail from '@/components/emails/team-invitation'

export async function createTeam(name: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if a team with this name already exists for this user
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: name.trim(),
        userId: user.id,
      },
    })

    if (existingTeam) {
      throw new Error('A team with this name already exists')
    }

    // Create the team directly
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        userId: user.id,
        traderIds: [user.id], // Add the creator as the first trader
        managers: {
          create: {
            managerId: user.id,
            access: 'admin', // Add the creator as admin manager
          }
        }
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true, team }
  } catch (error) {
    console.error('Error creating team:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create team' }
  }
}

export async function joinTeam(teamId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Add the user to the traderIds array if not already present
    const updatedTraderIds = team.traderIds.includes(user.id)
      ? team.traderIds
      : [...team.traderIds, user.id]

    await prisma.team.update({
      where: { id: teamId },
      data: {
        traderIds: updatedTraderIds,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error joining team:', error)
    return { success: false, error: 'Failed to join team' }
  }
}

export async function leaveTeam(teamId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Remove the user from the traderIds array
    const updatedTraderIds = team.traderIds.filter(id => id !== user.id)

    await prisma.team.update({
      where: { id: teamId },
      data: {
        traderIds: updatedTraderIds,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error leaving team:', error)
    return { success: false, error: 'Failed to leave team' }
  }
}

export async function getUserTeams() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Get teams where the user is the owner
    const ownedTeams = await prisma.team.findMany({
      where: { userId: user.id },
      include: {
        managers: {
          select: {
            id: true,
            managerId: true,
            access: true,
          },
        },
      },
    })

    // Get teams where the user is a trader
    const joinedTeams = await prisma.team.findMany({
      where: {
        traderIds: {
          has: user.id,
        },
        userId: {
          not: user.id, // Exclude teams where user is the owner
        },
      },
      include: {
        managers: {
          select: {
            id: true,
            managerId: true,
            access: true,
          },
        },
      },
    })

    // Get all unique trader IDs and manager IDs from all teams
    const allTeams = [...ownedTeams, ...joinedTeams]
    const allTraderIds = Array.from(new Set(allTeams.flatMap(b => b.traderIds)))
    const allManagerIds = Array.from(new Set(allTeams.flatMap(b => b.managers.map(m => m.managerId))))
    const allUserIds = Array.from(new Set([...allTraderIds, ...allManagerIds]))
    
    // Fetch all user details in one query
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: allUserIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    // Create a map for quick lookup
    const usersMap = new Map(users.map(u => [u.id, u]))

    // Enhance teams with trader and manager details
    const enhancedOwnedTeams = ownedTeams.map(team => ({
      ...team,
      traders: team.traderIds.map(id => usersMap.get(id)).filter((trader): trader is { id: string; email: string } => trader !== undefined),
      managers: team.managers.map(manager => ({
        ...manager,
        email: usersMap.get(manager.managerId)?.email || 'Unknown',
      })),
    }))

    const enhancedJoinedTeams = joinedTeams.map(team => ({
      ...team,
      traders: team.traderIds.map(id => usersMap.get(id)).filter((trader): trader is { id: string; email: string } => trader !== undefined),
      managers: team.managers.map(manager => ({
        ...manager,
        email: usersMap.get(manager.managerId)?.email || 'Unknown',
      })),
    }))

    return {
      success: true,
      ownedTeams: enhancedOwnedTeams,
      joinedTeams: enhancedJoinedTeams,
    }
  } catch (error) {
    console.error('Error getting user teams:', error)
    return { success: false, error: 'Failed to get teams' }
  }
}

export async function addManagerToTeam(teamId: string, managerEmail: string, access: 'admin' | 'viewer' = 'viewer') {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if current user is owner or admin of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = team.userId === user.id
    const isAdminManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only team owners and admin managers can add managers')
    }

    // Find the user by email
    const managerUser = await prisma.user.findUnique({
      where: { email: managerEmail },
    })

    if (!managerUser) {
      throw new Error('User with this email not found')
    }

    // Check if manager already exists
    const existingManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: managerUser.id,
        }
      }
    })

    if (existingManager) {
      throw new Error('Manager already exists')
    }

    // Add new manager
    await prisma.teamManager.create({
      data: {
        teamId,
        managerId: managerUser.id,
        access,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error adding manager to team:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add manager' }
  }
}

export async function removeManagerFromTeam(teamId: string, managerId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if current user is admin of this team
    const currentUserManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!currentUserManager || currentUserManager.access !== 'admin') {
      throw new Error('Unauthorized: Only admins can remove managers')
    }

    // Remove manager
    await prisma.teamManager.delete({
      where: {
        teamId_managerId: {
          teamId,
          managerId,
        }
      }
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error removing manager from team:', error)
    return { success: false, error: 'Failed to remove manager' }
  }
}

export async function updateManagerAccess(teamId: string, managerId: string, access: 'admin' | 'viewer') {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if current user is admin of this team
    const currentUserManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!currentUserManager || currentUserManager.access !== 'admin') {
      throw new Error('Unauthorized: Only admins can update manager access')
    }

    // Update manager access
    await prisma.teamManager.update({
      where: {
        teamId_managerId: {
          teamId,
          managerId,
        }
      },
      data: {
        access,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error updating manager access:', error)
    return { success: false, error: 'Failed to update manager access' }
  }
}

export async function getUserTeamAccess() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Get teams where user is a manager - much more efficient query!
    const managedTeams = await prisma.teamManager.findMany({
      where: { managerId: user.id },
      include: { 
        team: {
          include: {
            managers: {
              select: {
                id: true,
                managerId: true,
                access: true,
              },
            },
          },
        },
      }
    })

    // Get all unique trader IDs and manager IDs from managed teams
    const allTraderIds = Array.from(new Set(managedTeams.flatMap(bm => bm.team.traderIds)))
    const allManagerIds = Array.from(new Set(managedTeams.flatMap(bm => bm.team.managers.map(m => m.managerId))))
    const allUserIds = Array.from(new Set([...allTraderIds, ...allManagerIds]))
    
    // Fetch all user details in one query
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: allUserIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    // Create a map for quick lookup
    const usersMap = new Map(users.map(u => [u.id, u]))

    // Transform to include access level, trader details, and manager details
    const teamsWithAccess = managedTeams.map(bm => ({
      ...bm.team,
      userAccess: bm.access,
      traders: bm.team.traderIds.map(id => usersMap.get(id)).filter((trader): trader is { id: string; email: string } => trader !== undefined),
      managers: bm.team.managers.map(manager => ({
        ...manager,
        email: usersMap.get(manager.managerId)?.email || 'Unknown',
      })),
    }))

    return {
      success: true,
      managedTeams: teamsWithAccess,
    }
  } catch (error) {
    console.error('Error getting user team access:', error)
    return { success: false, error: 'Failed to get team access' }
  }
}

export async function deleteTeam(teamId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    if (team.userId !== user.id) {
      throw new Error('Unauthorized: Only team owners can delete teams')
    }

    // Delete the team (this will cascade delete all related records)
    await prisma.team.delete({
      where: { id: teamId },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting team:', error)
    return { success: false, error: 'Failed to delete team' }
  }
}

export async function renameTeam(teamId: string, newName: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    if (team.userId !== user.id) {
      throw new Error('Unauthorized: Only team owners can rename teams')
    }

    // Check if the new name is already taken by this user
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: newName,
        userId: user.id,
        id: { not: teamId }, // Exclude the current team
      },
    })

    if (existingTeam) {
      throw new Error('A team with this name already exists')
    }

    // Update the team name
    await prisma.team.update({
      where: { id: teamId },
      data: {
        name: newName,
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error renaming team:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to rename team' }
  }
}

export async function addTraderToTeam(teamId: string, traderEmail: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = team.userId === user.id
    const isAdminManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only team owners and admin managers can add traders')
    }

    // Find the user by email
    const traderUser = await prisma.user.findUnique({
      where: { email: traderEmail },
    })

    if (!traderUser) {
      throw new Error('User with this email not found')
    }

    // Check if trader is already in the team
    if (team.traderIds.includes(traderUser.id)) {
      throw new Error('Trader is already a member of this team')
    }

    // Add trader to the team
    await prisma.team.update({
      where: { id: teamId },
      data: {
        traderIds: {
          push: traderUser.id,
        },
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error adding trader to team:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add trader' }
  }
}

export async function sendTeamInvitation(teamId: string, traderEmail: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = team.userId === user.id
    const isAdminManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only team owners and admin managers can send invitations')
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.teamInvitation.findUnique({
      where: {
        teamId_email: {
          teamId,
          email: traderEmail,
        }
      }
    })

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      throw new Error('An invitation has already been sent to this email')
    }

    // Check if user is already a trader in this team
    const existingUser = await prisma.user.findUnique({
      where: { email: traderEmail },
    })

    if (existingUser && team.traderIds.includes(existingUser.id)) {
      throw new Error('User is already a member of this team')
    }

    // Create or update invitation
    const invitation = await prisma.teamInvitation.upsert({
      where: {
        teamId_email: {
          teamId,
          email: traderEmail,
        }
      },
      update: {
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedBy: user.id,
      },
      create: {
        teamId,
        email: traderEmail,
        invitedBy: user.id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Get inviter information
    const inviter = await prisma.user.findUnique({
      where: { id: user.id },
    })

    // Generate join URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://deltalytix.app')
    const joinUrl = `${baseUrl}/teams/join?invitation=${invitation.id}`

    // Render email
    const emailHtml = await render(
      TeamInvitationEmail({
        email: traderEmail,
        teamName: team.name,
        inviterName: inviter?.email?.split('@')[0] || 'trader',
        inviterEmail: inviter?.email || 'trader@example.com',
        joinUrl,
        language: existingUser?.language || 'en'
      })
    )

    // Send email
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailError } = await resend.emails.send({
      from: 'Deltalytix Team <team@eu.updates.deltalytix.app>',
      to: traderEmail,
      subject: existingUser?.language === 'fr' 
        ? `Invitation à rejoindre ${team.name} sur Deltalytix`
        : `Invitation to join ${team.name} on Deltalytix`,
      html: emailHtml,
      replyTo: 'hugo.demenez@deltalytix.app',
    })

    if (emailError) {
      console.error('Error sending invitation email:', emailError)
      throw new Error('Failed to send invitation email')
    }

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true, invitationId: invitation.id }
  } catch (error) {
    console.error('Error sending team invitation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send invitation' }
  }
}

export async function getTeamInvitations(teamId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = team.userId === user.id
    const isAdminManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only team owners and admin managers can view invitations')
    }

    // Get pending invitations
    const invitations = await prisma.teamInvitation.findMany({
      where: {
        teamId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      invitations,
    }
  } catch (error) {
    console.error('Error getting team invitations:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get invitations' }
  }
}

export async function removeTraderFromTeam(teamId: string, traderId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = team.userId === user.id
    const isAdminManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only team owners and admin managers can remove traders')
    }

    // Remove trader from the team
    await prisma.team.update({
      where: { id: teamId },
      data: {
        traderIds: team.traderIds.filter(id => id !== traderId),
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error removing trader from team:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove trader' }
  }
}

export async function cancelTeamInvitation(teamId: string, invitationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = team.userId === user.id
    const isAdminManager = await prisma.teamManager.findUnique({
      where: {
        teamId_managerId: {
          teamId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only team owners and admin managers can cancel invitations')
    }

    // Delete the invitation
    await prisma.teamInvitation.delete({
      where: {
        id: invitationId,
        teamId: teamId, // Extra security check
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error canceling team invitation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel invitation' }
  }
}

export async function getTeamInvitationDetails(invitationToken: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Find the invitation by token
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationToken },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired')
    }

    // Check if invitation is already accepted
    if (invitation.status === 'ACCEPTED') {
      throw new Error('Invitation already accepted')
    }

    // Check if the invitation is for the current user's email
    if (invitation.email !== user.email) {
      throw new Error('This invitation was sent to a different email address')
    }

    return {
      success: true,
      invitation: {
        id: invitation.id,
        teamId: invitation.teamId,
        teamName: invitation.team.name,
        email: invitation.email,
        status: invitation.status.toLowerCase(),
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
      }
    }
  } catch (error) {
    console.error('Error getting team invitation details:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get invitation details' }
  }
}

export async function joinTeamByInvitation(invitationToken: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Find the invitation by token
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationToken },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            traderIds: true,
          }
        }
      }
    })

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired')
    }

    // Check if invitation is already accepted
    if (invitation.status === 'ACCEPTED') {
      throw new Error('Invitation already accepted')
    }

    // Check if the invitation is for the current user's email
    if (invitation.email !== user.email) {
      throw new Error('This invitation was sent to a different email address')
    }

    // Check if user is already a member of this team
    if (invitation.team.traderIds.includes(user.id)) {
      throw new Error('You are already a member of this team')
    }

    // Accept the invitation by updating its status and adding user to team
    await prisma.$transaction([
      // Update invitation status
      prisma.teamInvitation.update({
        where: { id: invitationToken },
        data: { status: 'ACCEPTED' }
      }),
      // Add user to team
      prisma.team.update({
        where: { id: invitation.teamId },
        data: {
          traderIds: [...invitation.team.traderIds, user.id]
        }
      })
    ])

    revalidatePath('/dashboard/settings')
    revalidatePath('/teams/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error joining team by invitation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to join team' }
  }
}