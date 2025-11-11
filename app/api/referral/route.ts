import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import {
  getOrCreateReferral,
  getReferralBySlug,
  addReferredUser,
  getReferralTier,
  getNextTier,
} from '@/server/referral'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create referral for the user
    const referral = await getOrCreateReferral(userId)
    const count = referral.referredUserIds.length
    const tier = await getReferralTier(count)
    const nextTier = await getNextTier(count)

    // Get referred users details
    const referredUsers = await prisma.user.findMany({
      where: {
        id: {
          in: referral.referredUserIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        email: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        referral: {
          id: referral.id,
          slug: referral.slug,
          count,
          tier,
          nextTier,
          referredUsers,
        },
      },
    })
  } catch (error) {
    console.error('[referral/GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referral data' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug } = body

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Referral slug is required' },
        { status: 400 }
      )
    }

    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find referral by slug
    const referral = await getReferralBySlug(slug)

    if (!referral) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Check if user is trying to use their own referral code
    if (referral.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code' },
        { status: 400 }
      )
    }

    // Check if user is already referred
    if (referral.referredUserIds.includes(userId)) {
      return NextResponse.json(
        { error: 'You have already been referred' },
        { status: 400 }
      )
    }

    // Add user to referral list
    await addReferredUser(referral.id, userId)

    return NextResponse.json({
      success: true,
      message: 'Referral code applied successfully',
    })
  } catch (error) {
    console.error('[referral/POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to apply referral code' },
      { status: 500 }
    )
  }
}

