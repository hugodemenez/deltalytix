'use server'

import { createClient } from './auth'
import { prisma } from '@/lib/prisma'
import type { User } from '@supabase/supabase-js'
import type { Subscription } from '@/prisma/generated/prisma/client'

export type UserProfileData = {
  supabaseUser: User | null
  subscription: Subscription | null
}

/**
 * Get user profile data including Supabase user and subscription.
 * This is a regular server action without caching - meant to be used
 * with Suspense boundaries for loading states.
 * 
 * Next.js will automatically handle request memoization during a single render.
 */
export async function getUserProfileAction(): Promise<UserProfileData> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      supabaseUser: null,
      subscription: null
    }
  }

  // Fetch subscription data if user exists
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id }
  })

  return {
    supabaseUser: user,
    subscription
  }
}
