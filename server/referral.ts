import 'server-only'

import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

export type ReferralTier = {
  level: number
  reward: string
  count: number
}

// Helper function to generate a unique referral slug
function generateReferralSlug(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(chars.length))
  }
  return result
}

// Get or create a referral for the session user.
// Not a Server Action — call only from authenticated route handlers / trusted server code.
export async function getOrCreateReferral(userId?: string) {
  try {
    const sessionUserId = await getUserId()
    if (userId && userId !== sessionUserId) {
      throw new Error('Unauthorized')
    }
    const resolvedUserId = sessionUserId

    // Try to get existing referral
    let referral = await prisma.referral.findUnique({
      where: { userId: resolvedUserId },
    })

    // If no referral exists, create one
    if (!referral) {
      let slug = generateReferralSlug()
      let attempts = 0
      const maxAttempts = 5

      // Keep trying to find a unique slug
      while (attempts < maxAttempts) {
        try {
          referral = await prisma.referral.create({
            data: {
              userId: resolvedUserId,
              slug,
            },
          })
          break
        } catch (error: any) {
          if (error?.code === 'P2002') {
            // P2002 is Prisma's error code for unique constraint violation
            slug = generateReferralSlug()
            attempts++
            continue
          }
          throw error
        }
      }

      if (!referral) {
        throw new Error('Failed to generate unique referral slug after multiple attempts')
      }
    }

    return referral
  } catch (error) {
    console.error('Error getting or creating referral:', error)
    throw error
  }
}

// Add a referred user to a referral.
// Trusted callers only (Stripe webhook, authenticated /api/referral). Not an RPC.
export async function addReferredUser(referralId: string, referredUserId: string) {
  try {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
    })

    if (!referral) {
      throw new Error('Referral not found')
    }

    // Check if user is already in the list
    if (referral.referredUserIds.includes(referredUserId)) {
      return referral
    }

    // Add the user to the list
    const updatedReferral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        referredUserIds: {
          push: referredUserId,
        },
      },
    })

    return updatedReferral
  } catch (error) {
    console.error('Error adding referred user:', error)
    throw error
  }
}

// Get referral by slug (public lookup for checkout / apply-code flows).
// Omits owner PII — callers only need referral.userId for ownership checks.
export async function getReferralBySlug(slug: string) {
  try {
    const referral = await prisma.referral.findUnique({
      where: { slug },
      select: {
        id: true,
        userId: true,
        slug: true,
        referredUserIds: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return referral
  } catch (error) {
    console.error('Error getting referral by slug:', error)
    return null
  }
}

// Get referral tier based on count
export async function getReferralTier(count: number): Promise<ReferralTier> {
  if (count >= 5) {
    return {
      level: 3,
      reward: '50% discount',
      count: 5,
    }
  } else if (count >= 3) {
    return {
      level: 2,
      reward: 'Free team creation',
      count: 3,
    }
  } else if (count >= 1) {
    return {
      level: 1,
      reward: '10% discount code',
      count: 1,
    }
  } else {
    return {
      level: 0,
      reward: 'No reward yet',
      count: 0,
    }
  }
}

// Get next tier information
export async function getNextTier(count: number): Promise<{ count: number; reward: string } | null> {
  if (count >= 5) {
    return null // Already at max tier
  } else if (count >= 3) {
    return {
      count: 5,
      reward: '50% discount',
    }
  } else if (count >= 1) {
    return {
      count: 3,
      reward: 'Free team creation',
    }
  } else {
    return {
      count: 1,
      reward: '10% discount code',
    }
  }
}
