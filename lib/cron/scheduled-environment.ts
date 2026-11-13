/**
 * Vercel Schedules also exist on Preview branches and custom environments
 * (`beta` starts inactive). Preview/custom runs must not mutate production
 * data even if someone enables those schedules.
 *
 * Production (`VERCEL_ENV=production` and `VERCEL_TARGET_ENV=production`)
 * runs the jobs. `vercel dev` (`VERCEL=1`, `VERCEL_ENV=development`) runs
 * them so handlers can be tested. Off-Vercel hosts always refuse, even
 * with forged CloudEvent headers.
 *
 * Never set `ALLOW_SCHEDULED_JOBS=1` on `beta`: that custom environment
 * shares the production database. The override is refused when the target
 * is `beta`, or when a non-production deployment's `DATABASE_URL` matches
 * `PRODUCTION_DATABASE_URL`.
 */
export function isVercelScheduleHost(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.VERCEL === '1'
}

function scheduleTarget(
  env: Record<string, string | undefined>,
): string | undefined {
  return env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV
}

function sharesProductionDatabase(
  env: Record<string, string | undefined>,
): boolean {
  const databaseUrl = env.DATABASE_URL
  const productionUrl = env.PRODUCTION_DATABASE_URL
  if (!databaseUrl || !productionUrl) return false
  return databaseUrl === productionUrl
}

export function scheduledWorkAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!isVercelScheduleHost(env)) return false
  if (scheduleTarget(env) === 'beta') return false
  if (env.VERCEL_ENV !== 'production' && sharesProductionDatabase(env)) {
    return false
  }
  if (env.ALLOW_SCHEDULED_JOBS === '1') return true
  if (env.VERCEL_ENV === 'development') return true
  const target = scheduleTarget(env)
  return env.VERCEL_ENV === 'production' && target === 'production'
}
