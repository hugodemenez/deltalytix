/**
 * Vercel Schedules also exist on Preview branches and custom environments
 * (`beta` starts inactive). Preview/custom runs must not mutate production
 * data even if someone enables those schedules.
 *
 * Production (`VERCEL_ENV=production` and `VERCEL_TARGET_ENV=production`)
 * runs the jobs. Off-Vercel hosts always refuse, even with forged CloudEvent
 * headers. Development / `vercel dev` also refuse unless the override is set.
 *
 * Never enable schedules on `beta` or on a `main`/`beta` git ref outside
 * production: those share the production database (same signal as
 * `scripts/vercel-build.sh`). Override only with
 * `ALLOW_SCHEDULED_JOBS=<VERCEL_TARGET_ENV>` on a dedicated non-prod target
 * that does not share the production DB.
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

function gitCommitRef(
  env: Record<string, string | undefined>,
): string {
  return (env.VERCEL_GIT_COMMIT_REF ?? '').replace(/^refs\/heads\//, '')
}

function sharesProdGitRef(
  env: Record<string, string | undefined>,
): boolean {
  const ref = gitCommitRef(env)
  return ref === 'beta' || ref === 'main'
}

export function scheduledWorkAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!isVercelScheduleHost(env)) return false
  const target = scheduleTarget(env)
  if (target === 'beta') return false
  if (env.VERCEL_ENV !== 'production' && sharesProdGitRef(env)) {
    return false
  }
  const allow = env.ALLOW_SCHEDULED_JOBS
  if (allow != null && allow !== '' && allow !== '0' && allow !== 'false') {
    // Bind the override to the deploy target; bare "1"/"true" is not enough.
    return Boolean(target) && allow === target
  }
  return env.VERCEL_ENV === 'production' && target === 'production'
}

export function scheduledSkipReason(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (scheduledWorkAllowed(env)) return null
  if (!isVercelScheduleHost(env)) return 'not_vercel'
  const target = scheduleTarget(env) ?? 'unknown'
  if (target === 'beta') return 'beta_target'
  if (env.VERCEL_ENV !== 'production' && sharesProdGitRef(env)) {
    return 'shared_prod_git_ref'
  }
  return `env_not_allowed:${target}`
}
