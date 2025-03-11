'use server'

import { createClient } from '@/server/auth'
import { prisma } from '@/lib/prisma'
export async function updateFirstConnectionStatus() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    await prisma.user.update({
      where: {
        auth_user_id: user.id,
      },
      data: {
        isFirstConnection: false,
      },
    })
    return { success: true }
  } catch (error) {
    console.error('Error updating onboarding status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
} 

export async function getOnboardingStatus() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const onboardingStatus = await prisma.user.findUnique({
      where: { auth_user_id: user.id },
      select: {
        isFirstConnection: true,
      },
    })

    return onboardingStatus?.isFirstConnection ?? false
  } finally {
    await prisma.$disconnect()
  }
}
