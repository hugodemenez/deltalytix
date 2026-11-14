import { describe, expect, it } from 'vitest'
import {
  isVercelScheduleHost,
  scheduledSkipReason,
  scheduledWorkAllowed,
} from './scheduled-environment'

describe('scheduledWorkAllowed', () => {
  it('refuses local runs without VERCEL (S1)', () => {
    expect(isVercelScheduleHost({})).toBe(false)
    expect(scheduledWorkAllowed({})).toBe(false)
    expect(scheduledSkipReason({})).toBe('not_vercel')
  })

  it('refuses vercel development without a target-bound override (S4-r)', () => {
    expect(
      scheduledWorkAllowed({ VERCEL: '1', VERCEL_ENV: 'development' }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'development',
        VERCEL_TARGET_ENV: 'development',
        ALLOW_SCHEDULED_JOBS: '1',
      }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'development',
        VERCEL_TARGET_ENV: 'development',
        ALLOW_SCHEDULED_JOBS: 'development',
      }),
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

  it('refuses the custom beta environment even with a matching override (S3)', () => {
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
        ALLOW_SCHEDULED_JOBS: 'beta',
      }),
    ).toBe(false)
  })

  it('refuses non-production when VERCEL_GIT_COMMIT_REF is beta or main (S3-r)', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        VERCEL_GIT_COMMIT_REF: 'beta',
        ALLOW_SCHEDULED_JOBS: 'preview',
      }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        VERCEL_GIT_COMMIT_REF: 'refs/heads/main',
        ALLOW_SCHEDULED_JOBS: 'preview',
      }),
    ).toBe(false)
  })

  it('allows a dedicated non-prod env only when ALLOW_SCHEDULED_JOBS equals the target', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: '1',
      }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: 'true',
      }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: '0',
      }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: '',
      }),
    ).toBe(false)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: 'preview',
      }),
    ).toBe(true)
  })

  it('falls back to VERCEL_ENV when VERCEL_TARGET_ENV is missing', () => {
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'production',
      }),
    ).toBe(true)
    expect(
      scheduledWorkAllowed({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        ALLOW_SCHEDULED_JOBS: 'preview',
      }),
    ).toBe(true)
  })
})
