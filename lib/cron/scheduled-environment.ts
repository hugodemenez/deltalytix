/**
 * Vercel Schedules also exist on Preview branches and custom environments
 * (`beta` starts inactive). Preview/custom runs must not mutate production
 * data even if someone enables those schedules.
 *
 * Production (`VERCEL_ENV=production` and `VERCEL_TARGET_ENV=production`)
 * runs the jobs. Local and `vercel dev` run them so handlers can be tested.
 * Set `ALLOW_SCHEDULED_JOBS=1` on a dedicated non-prod environment only after
 * confirming its DATABASE_URL / Resend keys are not production.
 */
export function scheduledWorkAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.ALLOW_SCHEDULED_JOBS === '1') return true
  if (!env.VERCEL) return true
  if (env.VERCEL_ENV === 'development') return true
  const target = env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV
  return env.VERCEL_ENV === 'production' && target === 'production'
}
