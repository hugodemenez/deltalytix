import {
  parseScheduleEvent,
  ScheduleEventParseError,
  type ScheduleMetadata,
} from '@vercel/schedules'
import {
  isVercelScheduleHost,
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
 * `ALLOW_SCHEDULED_JOBS=1` on a dedicated (non-production) database.
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
        { error: 'Schedule dispatch refused' },
        { status: 403 },
      )
    }
    if (!scheduledWorkAllowed()) {
      console.info(
        `[schedule] skipping ${metadata.name} on ${
          process.env.VERCEL_TARGET_ENV ?? process.env.VERCEL_ENV ?? 'unknown'
        }`,
      )
      return new Response(null, { status: 200 })
    }
    await run(metadata, request)
    return new Response(null, { status: 200 })
  }
}
