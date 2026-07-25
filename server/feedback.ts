'use server'

import { capturePostHogEvent } from '@/lib/posthog-server'
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

  // consentGranted: the user typed this and pressed send, so it is a submission
  // fulfilling their own request rather than passive analytics. Same reasoning
  // as the Stripe webhook events.
  const delivered = await capturePostHogEvent({
    consentGranted: true,
    distinctId: user.id,
    event: 'feedback_submitted',
    properties: {
      feedback_type: input.type,
      feedback_message: message,
      email: user.email ?? null,
    },
  })

  // PostHog is the only store for feedback, so a dropped event means the
  // message is gone. Surface it instead of showing a success toast.
  if (!delivered) {
    throw new Error('Failed to deliver feedback')
  }

  return { success: true }
}
