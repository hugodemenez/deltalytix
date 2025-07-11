'use server'

import { prisma } from '@/lib/prisma'
import auth from '@/locales/en/auth'
import { createClient } from '@/server/auth'
import { revalidatePath } from 'next/cache'

export async function createBusiness(name: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Redirect to Stripe checkout for business subscription
    const formData = new FormData()
    formData.append('businessName', name)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/create-business-checkout-session`, {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const redirectUrl = response.headers.get('location')
      if (redirectUrl) {
        return { success: true, redirectUrl }
      }
    }

    return { success: false, error: 'Failed to create checkout session' }
  } catch (error) {
    console.error('Error creating business checkout session:', error)
    return { success: false, error: 'Failed to create business' }
  }
}

export async function joinBusiness(businessId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    // Add the user to the traderIds array if not already present
    const updatedTraderIds = business.traderIds.includes(user.id)
      ? business.traderIds
      : [...business.traderIds, user.id]

    await prisma.business.update({
      where: { id: businessId },
      data: {
        traderIds: updatedTraderIds,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error joining business:', error)
    return { success: false, error: 'Failed to join business' }
  }
}

export async function leaveBusiness(businessId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    // Remove the user from the traderIds array
    const updatedTraderIds = business.traderIds.filter(id => id !== user.id)

    await prisma.business.update({
      where: { id: businessId },
      data: {
        traderIds: updatedTraderIds,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error leaving business:', error)
    return { success: false, error: 'Failed to leave business' }
  }
}

export async function getUserBusinesses() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Get businesses where the user is the owner
    const ownedBusinesses = await prisma.business.findMany({
      where: { userId: user.id },
    })

    // Get businesses where the user is a trader
    const joinedBusinesses = await prisma.business.findMany({
      where: {
        traderIds: {
          has: user.id,
        },
        userId: {
          not: user.id, // Exclude businesses where user is the owner
        },
      },
    })

    // Get all unique trader IDs from all businesses
    const allBusinesses = [...ownedBusinesses, ...joinedBusinesses]
    const allTraderIds = Array.from(new Set(allBusinesses.flatMap(b => b.traderIds)))
    
    // Fetch all trader details in one query
    const traders = await prisma.user.findMany({
      where: {
        id: {
          in: allTraderIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    // Create a map for quick lookup
    const tradersMap = new Map(traders.map(t => [t.id, t]))

    // Enhance businesses with trader details
    const enhancedOwnedBusinesses = ownedBusinesses.map(business => ({
      ...business,
      traders: business.traderIds.map(id => tradersMap.get(id)).filter((trader): trader is { id: string; email: string } => trader !== undefined),
    }))

    const enhancedJoinedBusinesses = joinedBusinesses.map(business => ({
      ...business,
      traders: business.traderIds.map(id => tradersMap.get(id)).filter((trader): trader is { id: string; email: string } => trader !== undefined),
    }))

    return {
      success: true,
      ownedBusinesses: enhancedOwnedBusinesses,
      joinedBusinesses: enhancedJoinedBusinesses,
    }
  } catch (error) {
    console.error('Error getting user businesses:', error)
    return { success: false, error: 'Failed to get businesses' }
  }
}

export async function addManagerToBusiness(businessId: string, managerId: string, access: 'admin' | 'viewer' = 'viewer') {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if current user is admin of this business
    const currentUserManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!currentUserManager || currentUserManager.access !== 'admin') {
      throw new Error('Unauthorized: Only admins can add managers')
    }

    // Check if manager already exists
    const existingManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId,
        }
      }
    })

    if (existingManager) {
      throw new Error('Manager already exists')
    }

    // Add new manager
    await prisma.businessManager.create({
      data: {
        businessId,
        managerId,
        access,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error adding manager to business:', error)
    return { success: false, error: 'Failed to add manager' }
  }
}

export async function removeManagerFromBusiness(businessId: string, managerId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if current user is admin of this business
    const currentUserManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!currentUserManager || currentUserManager.access !== 'admin') {
      throw new Error('Unauthorized: Only admins can remove managers')
    }

    // Remove manager
    await prisma.businessManager.delete({
      where: {
        businessId_managerId: {
          businessId,
          managerId,
        }
      }
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error) {
    console.error('Error removing manager from business:', error)
    return { success: false, error: 'Failed to remove manager' }
  }
}

export async function updateManagerAccess(businessId: string, managerId: string, access: 'admin' | 'viewer') {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if current user is admin of this business
    const currentUserManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!currentUserManager || currentUserManager.access !== 'admin') {
      throw new Error('Unauthorized: Only admins can update manager access')
    }

    // Update manager access
    await prisma.businessManager.update({
      where: {
        businessId_managerId: {
          businessId,
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

export async function getUserBusinessAccess() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Get businesses where user is a manager - much more efficient query!
    const managedBusinesses = await prisma.businessManager.findMany({
      where: { managerId: user.id },
      include: { business: true }
    })

    // Get all unique trader IDs from managed businesses
    const allTraderIds = Array.from(new Set(managedBusinesses.flatMap(bm => bm.business.traderIds)))
    
    // Fetch all trader details in one query
    const traders = await prisma.user.findMany({
      where: {
        id: {
          in: allTraderIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    // Create a map for quick lookup
    const tradersMap = new Map(traders.map(t => [t.id, t]))

    // Transform to include access level and trader details
    const businessesWithAccess = managedBusinesses.map(bm => ({
      ...bm.business,
      userAccess: bm.access,
      traders: bm.business.traderIds.map(id => tradersMap.get(id)).filter((trader): trader is { id: string; email: string } => trader !== undefined),
    }))

    return {
      success: true,
      managedBusinesses: businessesWithAccess,
    }
  } catch (error) {
    console.error('Error getting user business access:', error)
    return { success: false, error: 'Failed to get business access' }
  }
}

export async function deleteBusiness(businessId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    if (business.userId !== user.id) {
      throw new Error('Unauthorized: Only business owners can delete businesses')
    }

    // Delete the business (this will cascade delete all related records)
    await prisma.business.delete({
      where: { id: businessId },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/business/manage')
    return { success: true }
  } catch (error) {
    console.error('Error deleting business:', error)
    return { success: false, error: 'Failed to delete business' }
  }
}

export async function renameBusiness(businessId: string, newName: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    if (business.userId !== user.id) {
      throw new Error('Unauthorized: Only business owners can rename businesses')
    }

    // Check if the new name is already taken by this user
    const existingBusiness = await prisma.business.findFirst({
      where: {
        name: newName,
        userId: user.id,
        id: { not: businessId }, // Exclude the current business
      },
    })

    if (existingBusiness) {
      throw new Error('A business with this name already exists')
    }

    // Update the business name
    await prisma.business.update({
      where: { id: businessId },
      data: {
        name: newName,
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/business/manage')
    return { success: true }
  } catch (error) {
    console.error('Error renaming business:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to rename business' }
  }
}

export async function addTraderToBusiness(businessId: string, traderEmail: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = business.userId === user.id
    const isAdminManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only business owners and admin managers can add traders')
    }

    // Find the user by email
    const traderUser = await prisma.user.findUnique({
      where: { email: traderEmail },
    })

    if (!traderUser) {
      throw new Error('User with this email not found')
    }

    // Check if trader is already in the business
    if (business.traderIds.includes(traderUser.id)) {
      throw new Error('Trader is already a member of this business')
    }

    // Add trader to the business
    await prisma.business.update({
      where: { id: businessId },
      data: {
        traderIds: {
          push: traderUser.id,
        },
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/business/manage')
    return { success: true }
  } catch (error) {
    console.error('Error adding trader to business:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add trader' }
  }
}

export async function sendBusinessInvitation(businessId: string, traderEmail: string) {
  console.log('Debug - Business ID:', businessId)
  console.log('Debug - Trader Email:', traderEmail)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = business.userId === user.id
    const isAdminManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only business owners and admin managers can send invitations')
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.businessInvitation.findUnique({
      where: {
        businessId_email: {
          businessId,
          email: traderEmail,
        }
      }
    })

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      throw new Error('An invitation has already been sent to this email')
    }

    // Send invitation via API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/business/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId,
        email: traderEmail,
        inviterId: user.id,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send invitation')
    }

    revalidatePath('/dashboard/settings')
    revalidatePath('/business/manage')
    return { success: true, invitationId: result.invitationId }
  } catch (error) {
    console.error('Error sending business invitation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send invitation' }
  }
}

export async function getBusinessInvitations(businessId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = business.userId === user.id
    const isAdminManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only business owners and admin managers can view invitations')
    }

    // Get pending invitations
    const invitations = await prisma.businessInvitation.findMany({
      where: {
        businessId,
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
    console.error('Error getting business invitations:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to get invitations' }
  }
}

export async function removeTraderFromBusiness(businessId: string, traderId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = business.userId === user.id
    const isAdminManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only business owners and admin managers can remove traders')
    }

    // Remove trader from the business
    await prisma.business.update({
      where: { id: businessId },
      data: {
        traderIds: business.traderIds.filter(id => id !== traderId),
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/business/manage')
    return { success: true }
  } catch (error) {
    console.error('Error removing trader from business:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove trader' }
  }
}

export async function cancelBusinessInvitation(businessId: string, invitationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Check if user is the owner or admin of this business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new Error('Business not found')
    }

    // Check if current user is owner or admin manager
    const isOwner = business.userId === user.id
    const isAdminManager = await prisma.businessManager.findUnique({
      where: {
        businessId_managerId: {
          businessId,
          managerId: user.id,
        }
      }
    })

    if (!isOwner && (!isAdminManager || isAdminManager.access !== 'admin')) {
      throw new Error('Unauthorized: Only business owners and admin managers can cancel invitations')
    }

    // Delete the invitation
    await prisma.businessInvitation.delete({
      where: {
        id: invitationId,
        businessId: businessId, // Extra security check
      },
    })

    revalidatePath('/dashboard/settings')
    revalidatePath('/business/manage')
    return { success: true }
  } catch (error) {
    console.error('Error canceling business invitation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel invitation' }
  }
}

export async function getBusinessInvitationDetails(invitationToken: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Find the invitation by token
    const invitation = await prisma.businessInvitation.findUnique({
      where: { id: invitationToken },
      include: {
        business: {
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
        businessId: invitation.businessId,
        businessName: invitation.business.name,
        email: invitation.email,
        status: invitation.status.toLowerCase(),
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
      }
    }
  } catch (error) {
    console.error('Error getting business invitation details:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get invitation details' }
  }
}

export async function joinBusinessByInvitation(invitationToken: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      throw new Error('Unauthorized')
    }

    // Find the invitation by token
    const invitation = await prisma.businessInvitation.findUnique({
      where: { id: invitationToken },
      include: {
        business: {
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

    // Check if user is already a member of this business
    if (invitation.business.traderIds.includes(user.id)) {
      throw new Error('You are already a member of this business')
    }

    // Accept the invitation by updating its status and adding user to business
    await prisma.$transaction([
      // Update invitation status
      prisma.businessInvitation.update({
        where: { id: invitationToken },
        data: { status: 'ACCEPTED' }
      }),
      // Add user to business
      prisma.business.update({
        where: { id: invitation.businessId },
        data: {
          traderIds: [...invitation.business.traderIds, user.id]
        }
      })
    ])

    revalidatePath('/dashboard/settings')
    revalidatePath('/business/manage')
    return { success: true }
  } catch (error) {
    console.error('Error joining business by invitation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to join business' }
  }
}