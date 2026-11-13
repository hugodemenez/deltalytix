import { afterEach, describe, expect, it } from 'vitest'
import {
  isVercelScheduleHost,
  scheduledWorkAllowed,
} from './scheduled-environment'

describe('scheduledWorkAllowed', () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_TARGET_ENV: process.env.VERCEL_TARGET_ENV,
    ALLOW_SCHEDULED_JOBS: process.env.ALLOW_SCHEDULED_JOBS,
    DATABASE_URL: process.env.DATABASE_URL,
    PRODUCTION_DATABASE_URL: process.env.PRODUCTION_DATABASE_URL,
  }

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('refuses local runs without VERCEL (S1)', () => {
    expect(isVercelScheduleHost({})).toBe(false)
    expect(scheduledWorkAllowed({})).toBe(false)
  })

  it('allows vercel dev', () => {
    expect(
      scheduledWorkAllowed({ VERCEL: '1', VERCEL_ENV: 'development' }),
    ).toBe(true)
  })

  it('allows production', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'production',
        VERCEL_TARGET_ENV: 'production',
      }),
    ).toBe(true)
  })

  it('refuses Preview branch deployments', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
      }),
    ).toBe(false)
  })

  it('refuses the custom beta environment even with ALLOW_SCHEDULED_JOBS (S3)', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'beta',
      }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'beta',
        ALLOW_SCHEDULED_JOBS: '1',
      }),
    ).toBe(false)
  })

  it('allows a dedicated non-prod env only with ALLOW_SCHEDULED_JOBS', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: '1',
      }),
    ).toBe(true)
  })

  it('refuses a non-prod env whose DATABASE_URL matches production (S3)', () => {
    const prod = 'postgresql://user:pass@prod-host:5432/app'
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: '1',
        DATABASE_URL: prod,
        PRODUCTION_DATABASE_URL: prod,
      }),
    ).toBe(false)
  })
})
