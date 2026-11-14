import {
  parseScheduleEvent,
  ScheduleEventParseError,
  type ScheduleMetadata,
} from '@vercel/schedules'
import {
  isVercelScheduleHost,
  scheduledSkipReason,
  scheduledWorkAllowed,
} from './scheduled-environment'

export type PrivateScheduleRun = (
  metadata: ScheduleMetadata,
  request: Request,
) => void | Promise<void>

/**
 * Private function-target handler. CloudEvent headers are not a credential:
 * `@vercel/schedules` only parses them (`handleSchedule` has no signature
 * check). Off-Vercel hosts are refused (403) even when the headers look
 * like a dispatch. On Vercel, non-production environments no-op unless
 * `ALLOW_SCHEDULED_JOBS=<VERCEL_TARGET_ENV>` on a dedicated DB.
 *
 * Delivery is at-least-once. Callers that mutate data must be idempotent
 * (e.g. weekly-recap Resend keys). No process-wide executionId lock is
 * shared across instances; document retries as expected.
 */
export function handlePrivateSchedule(run: PrivateScheduleRun) {
  return async (request: Request): Promise<Response> => {
    let metadata: ScheduleMetadata
    try {
      metadata = await parseScheduleEvent(request)
    } catch (error) {
      if (error instanceof ScheduleEventParseError) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      return Response.json(
        { error: 'Failed to parse schedule dispatch' },
        { status: 500 },
      )
    }
    if (!isVercelScheduleHost()) {
      return Response.json(
        { error: 'Schedule dispatch refused', reason: 'not_vercel' },
        { status: 403 },
      )
    }
    if (!scheduledWorkAllowed()) {
      const reason = scheduledSkipReason() ?? 'env_not_allowed'
      console.warn(
        `[schedule] skipping ${metadata.name} execution=${metadata.executionId} reason=${reason}`,
      )
      return Response.json(
        { skipped: true, reason, name: metadata.name, executionId: metadata.executionId },
        { status: 200 },
      )
    }
    try {
      await run(metadata, request)
      return new Response(null, { status: 200 })
    } catch (error) {
      console.error(
        `[schedule] ${metadata.name} execution=${metadata.executionId} failed`,
        error,
      )
      return Response.json(
        { error: 'Schedule handler failed', name: metadata.name, executionId: metadata.executionId },
        { status: 500 },
      )
    }
  }
}
