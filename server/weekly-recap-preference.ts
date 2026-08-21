'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/server/auth'

async function requireUserEmail(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.trim()
  if (!user?.id || !email) {
    throw new Error('Unauthorized')
  }
  return email
}

/**
 * Sunday cron already honors `Newsletter.isActive` by email.
 * Create the row on first read so the Settings toggle and cron stay aligned.
 */
export async function getWeeklyRecapPreference(): Promise<boolean> {
  const email = await requireUserEmail()
  const row = await prisma.newsletter.upsert({
    where: { email },
    create: { email, isActive: true },
    update: {},
  })
  return row.isActive
}

export async function setWeeklyRecapPreference(
  isActive: boolean
): Promise<{ success: true; isActive: boolean }> {
  const email = await requireUserEmail()
  const row = await prisma.newsletter.upsert({
    where: { email },
    create: { email, isActive },
    update: { isActive },
  })
  return { success: true, isActive: row.isActive }
}
