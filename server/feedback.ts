'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from './auth'

const FEEDBACK_TYPES = ['bug', 'feature', 'other'] as const
export type FeedbackType = (typeof FEEDBACK_TYPES)[number]

const MAX_MESSAGE_LENGTH = 2000

export async function submitFeedback(input: {
  type: FeedbackType
  message: string
}): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }

  const message = (input?.message ?? '').trim()
  if (!message) {
    throw new Error('Message is required')
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Message is too long')
  }

  if (!FEEDBACK_TYPES.includes(input?.type)) {
    throw new Error('Invalid feedback type')
  }

  await prisma.userFeedback.create({
    data: {
      userId: user.id,
      email: user.email ?? null,
      type: input.type,
      message,
    },
  })

  return { success: true }
}
