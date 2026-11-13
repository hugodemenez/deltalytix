import { afterEach, describe, expect, it } from 'vitest'
import { scheduledWorkAllowed } from './scheduled-environment'

describe('scheduledWorkAllowed', () => {
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

  it('allows local runs without VERCEL', () => {
    expect(scheduledWorkAllowed({})).toBe(true)
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

  it('refuses the custom beta environment', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'beta',
      }),
    ).toBe(false)
  })

  it('allows a dedicated non-prod env only with ALLOW_SCHEDULED_JOBS', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'beta',
        ALLOW_SCHEDULED_JOBS: '1',
      }),
    ).toBe(true)
  })
})
