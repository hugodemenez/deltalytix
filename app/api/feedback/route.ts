import { NextResponse } from 'next/server'

import { capturePostHogEvent } from '@/lib/posthog-server'
import {
  MAX_FEEDBACK_LENGTH,
  isFeedbackType,
  toFeedbackLocale,
} from '@/lib/feedback'
import { createClient } from '@/server/auth'
import {
  sendFeedbackAcknowledgementEmail,
  sendFeedbackNotificationEmail,
} from '@/server/feedback-emails'

// A Route Handler rather than a server action, deliberately: on Next
// 16.3-preview + Turbopack, importing @react-email/render from a server action
// makes the bundler emit an unresolvable hashed external, which breaks *every*
// action sharing that route chunk. Route handlers bundle it correctly.
//
// No `dynamic` route-segment export here: it is rejected under
// `cacheComponents`, and a POST handler is dynamic regardless.

/**
 * The page the report came from, which is most of the context a bug report
 * needs. Query and hash are dropped: they can carry tokens or personal data,
 * and the path is the diagnostically useful part.
 */
function pageFromReferer(referer: string | null) {
  if (!referer) return null
  try {
    const url = new URL(referer)
    return `${url.origin}${url.pathname}`
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { type, message: rawMessage, locale: rawLocale } = (body ?? {}) as Record<
    string,
    unknown
  >

  const message = typeof rawMessage === 'string' ? rawMessage.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  if (message.length > MAX_FEEDBACK_LENGTH) {
    return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
  }
  if (!isFeedbackType(type)) {
    return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 })
  }

  const locale = toFeedbackLocale(rawLocale)
  const page = pageFromReferer(request.headers.get('referer'))

  // Identity comes from the session, never the payload, so this cannot be used
  // to send mail on someone else's behalf.
  const emailInput = {
    type,
    message,
    userId: user.id,
    userEmail: user.email ?? null,
    locale,
    page,
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
        feedback_type: type,
        feedback_message: message,
        email: user.email ?? null,
        locale,
        page,
      },
    }),
    sendFeedbackNotificationEmail(emailInput),
  ])

  // Only a total failure loses the message. Surface that instead of reporting
  // success; either channel landing means the team has the feedback.
  if (!capturedByPostHog && !emailedToSupport) {
    return NextResponse.json(
      { error: 'Failed to deliver feedback' },
      { status: 502 },
    )
  }

  // Courtesy confirmation to the submitter — never allowed to fail the
  // submission, which has already been delivered above.
  await sendFeedbackAcknowledgementEmail(emailInput)

  return NextResponse.json({ success: true })
}
