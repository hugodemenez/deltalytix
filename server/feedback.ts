'use server'

import { capturePostHogEvent } from '@/lib/posthog-server'
import { createClient } from './auth'
import {
  sendFeedbackAcknowledgementEmail,
  sendFeedbackNotificationEmail,
} from './feedback-emails'

const FEEDBACK_TYPES = ['bug', 'feature', 'other'] as const
export type FeedbackType = (typeof FEEDBACK_TYPES)[number]

const LOCALES = ['en', 'fr'] as const
type FeedbackLocale = (typeof LOCALES)[number]

const MAX_MESSAGE_LENGTH = 2000

export async function submitFeedback(input: {
  type: FeedbackType
  message: string
  locale?: string
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

  const locale: FeedbackLocale = LOCALES.includes(input?.locale as FeedbackLocale)
    ? (input.locale as FeedbackLocale)
    : 'en'

  const emailInput = {
    type: input.type,
    message,
    userId: user.id,
    userEmail: user.email ?? null,
    locale,
  }

  // Two independent delivery channels. PostHog is the analytics/correlation
  // layer; the support inbox is the durable one, since PostHog event retention
  // is plan-limited.
  //
  // consentGranted: the user typed this and pressed send, so it is a submission
  // fulfilling their own request rather than passive analytics. Same reasoning
  // as the Stripe webhook events.
  const [capturedByPostHog, emailedToSupport] = await Promise.all([
    capturePostHogEvent({
      consentGranted: true,
      distinctId: user.id,
      event: 'feedback_submitted',
      properties: {
        feedback_type: input.type,
        feedback_message: message,
        email: user.email ?? null,
        locale,
      },
    }),
    sendFeedbackNotificationEmail(emailInput),
  ])

  // Only a total failure loses the message. Surface that instead of showing a
  // success toast; either channel landing means the team has the feedback.
  if (!capturedByPostHog && !emailedToSupport) {
    throw new Error('Failed to deliver feedback')
  }

  // Courtesy confirmation to the submitter — never allowed to fail the
  // submission, which has already been delivered above.
  await sendFeedbackAcknowledgementEmail(emailInput)

  return { success: true }
}
