import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CLOUD_EVENT_ID_HEADER,
  CLOUD_EVENT_SOURCE_HEADER,
  CLOUD_EVENT_SPEC_VERSION_HEADER,
  CLOUD_EVENT_TYPE_HEADER,
  SCHEDULE_CLOUD_EVENT_TYPE,
  SCHEDULE_EXPRESSION_HEADER,
  SCHEDULE_ID_HEADER,
  SCHEDULE_NAME_HEADER,
  SCHEDULE_NAMESPACE_HEADER,
  SCHEDULE_SCHEDULED_AT_HEADER,
  SCHEDULE_SOURCE_HEADER,
} from '@vercel/schedules'
import { handlePrivateSchedule } from './handle-private-schedule'

function scheduleRequest(name = 'daily-sync') {
  return new Request('https://example.test/api/cron/daily-sync', {
    method: 'POST',
    headers: {
      [CLOUD_EVENT_SPEC_VERSION_HEADER]: '1.0',
      [CLOUD_EVENT_TYPE_HEADER]: SCHEDULE_CLOUD_EVENT_TYPE,
      [CLOUD_EVENT_SOURCE_HEADER]: `/schedule/default/${name}`,
      [CLOUD_EVENT_ID_HEADER]: 'schx_test',
      [SCHEDULE_ID_HEADER]: 'sch_test',
      [SCHEDULE_NAME_HEADER]: name,
      [SCHEDULE_NAMESPACE_HEADER]: 'default',
      [SCHEDULE_SCHEDULED_AT_HEADER]: '2026-11-13T12:00:00.000Z',
      [SCHEDULE_SOURCE_HEADER]: 'static',
      [SCHEDULE_EXPRESSION_HEADER]: '*/5 * * * *',
    },
  })
}

describe('handlePrivateSchedule', () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_TARGET_ENV: process.env.VERCEL_TARGET_ENV,
    ALLOW_SCHEDULED_JOBS: process.env.ALLOW_SCHEDULED_JOBS,
  }

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('rejects calls that are not schedule dispatches', async () => {
    const run = vi.fn()
    const POST = handlePrivateSchedule(run)
    const response = await POST(
      new Request('https://example.test/api/cron/daily-sync', { method: 'POST' }),
    )
    expect(response.status).toBe(400)
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a Bearer CRON_SECRET request that is not a schedule dispatch', async () => {
    const run = vi.fn()
    const POST = handlePrivateSchedule(run)
    const response = await POST(
      new Request('https://example.test/api/cron/daily-sync', {
        method: 'POST',
        headers: { authorization: 'Bearer cron-secret' },
      }),
    )
    expect(response.status).toBe(400)
    expect(run).not.toHaveBeenCalled()
  })

  it('runs the job for a valid schedule dispatch', async () => {
    const run = vi.fn()
    const POST = handlePrivateSchedule(run)
    const response = await POST(scheduleRequest())
    expect(response.status).toBe(200)
    expect(run).toHaveBeenCalledTimes(1)
    expect(run.mock.calls[0][0]).toMatchObject({
      name: 'daily-sync',
      executionId: 'schx_test',
    })
  })

  it('no-ops Preview dispatches instead of mutating data', async () => {
    process.env.VERCEL = '1'
    process.env.VERCEL_ENV = 'preview'
    process.env.VERCEL_TARGET_ENV = 'preview'
    delete process.env.ALLOW_SCHEDULED_JOBS
    const run = vi.fn()
    const POST = handlePrivateSchedule(run)
    const response = await POST(scheduleRequest())
    expect(response.status).toBe(200)
    expect(run).not.toHaveBeenCalled()
  })
})
