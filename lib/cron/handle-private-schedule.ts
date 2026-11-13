import { handleSchedule, type ScheduleMetadata } from '@vercel/schedules'
import { scheduledWorkAllowed } from './scheduled-environment'

export type PrivateScheduleRun = (
  metadata: ScheduleMetadata,
  request: Request,
) => void | Promise<void>

/**
 * Private function-target handler. `handleSchedule` returns 400 unless the
 * request is a Vercel schedule dispatch. Non-production environments no-op
 * unless `ALLOW_SCHEDULED_JOBS=1`.
 */
export function handlePrivateSchedule(run: PrivateScheduleRun) {
  return handleSchedule(async (metadata, request) => {
    if (!scheduledWorkAllowed()) {
      console.info(
        `[schedule] skipping ${metadata.name} on ${
          process.env.VERCEL_TARGET_ENV ?? process.env.VERCEL_ENV ?? 'unknown'
        }`,
      )
      return
    }
    await run(metadata, request)
  })
}
