import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

type VercelConfig = {
  crons?: unknown
  functions?: Record<string, { experimentalTriggers?: Array<{ type?: string }> }>
  schedules?: Record<
    string,
    {
      schedule?: string
      timezone?: string
      function?: string
      path?: string
      topic?: string
      jitter?: unknown
      service?: unknown
      requestMethod?: unknown
    }
  >
}

/** Named schedule → App Router function id (must stay exact; a swap must fail). */
const EXPECTED_SCHEDULE_FUNCTIONS: Record<string, { schedule: string; function: string }> = {
  investing: { schedule: '0 5 * * 1', function: 'api/cron/investing' },
  'renewal-notice': { schedule: '0 9 * * *', function: 'api/cron/renewal-notice' },
  'renew-tradovate-token': {
    schedule: '*/10 * * * *',
    function: 'api/cron/renew-tradovate-token',
  },
  'daily-sync': { schedule: '*/5 * * * *', function: 'api/cron/daily-sync' },
  'weekly-recap': { schedule: '0 7 * * 0', function: 'api/cron' },
}

const CRON_ROUTE_GLOBS = [
  'app/api/cron/route.ts',
  'app/api/cron/daily-sync/route.ts',
  'app/api/cron/investing/route.ts',
  'app/api/cron/renewal-notice/route.ts',
  'app/api/cron/renew-tradovate-token/route.ts',
]

function maxDurationFrom(file: string): number | null {
  const text = readFileSync(file, 'utf8')
  const match = text.match(/export const maxDuration\s*=\s*(\d+)/)
  return match ? Number(match[1]) : null
}

function collectRouteFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectRouteFiles(full, out)
    else if (entry.name === 'route.ts') out.push(full)
  }
  return out
}

describe('vercel.json schedules contract (T1-r)', () => {
  const config = JSON.parse(
    readFileSync(path.join(root, 'vercel.json'), 'utf8'),
  ) as VercelConfig

  it('has no legacy crons entries', () => {
    expect(config.crons).toBeUndefined()
  })

  it('maps each named schedule to a unique function id with UTC expression', () => {
    expect(Object.keys(config.schedules ?? {}).sort()).toEqual(
      Object.keys(EXPECTED_SCHEDULE_FUNCTIONS).sort(),
    )
    const functionIds: string[] = []
    for (const [name, expected] of Object.entries(EXPECTED_SCHEDULE_FUNCTIONS)) {
      const entry = config.schedules?.[name]
      expect(entry?.schedule).toBe(expected.schedule)
      expect(entry?.timezone).toBe('UTC')
      expect(entry?.function).toBe(expected.function)
      expect(entry?.path).toBeUndefined()
      expect(entry?.topic).toBeUndefined()
      expect(entry?.jitter).toBeUndefined()
      expect(entry?.service).toBeUndefined()
      expect(entry?.requestMethod).toBeUndefined()
      functionIds.push(entry!.function!)
    }
    expect(new Set(functionIds).size).toBe(functionIds.length)
  })

  it('maps each schedule function id to an existing App Router route with schedule/v1beta', () => {
    for (const [name, entry] of Object.entries(config.schedules ?? {})) {
      const id = entry.function
      expect(id, `${name} missing function id`).toBeTruthy()
      const routeFile = path.join(root, 'app', `${id}/route.ts`)
      expect(existsSync(routeFile), `${name} function ${id} → ${routeFile}`).toBe(
        true,
      )
      const source = readFileSync(routeFile, 'utf8')
      expect(source).toMatch(/export const POST\s*=/)
      expect(source).not.toMatch(/export async function GET/)
      expect(source).not.toMatch(/export const GET\s*=/)
      const functionsKey = `app/${id}/route.ts`
      expect(config.functions?.[functionsKey]?.experimentalTriggers).toEqual([
        { type: 'schedule/v1beta' },
      ])
    }
  })
})

describe('cron maxDuration isolation (C2-r)', () => {
  it('keeps cron maxDurations distinct from each other and from every non-cron route', () => {
    const cronDurations = CRON_ROUTE_GLOBS.map((rel) => {
      const value = maxDurationFrom(path.join(root, rel))
      expect(value, rel).toEqual(expect.any(Number))
      return value as number
    })
    expect(new Set(cronDurations).size).toBe(cronDurations.length)

    const nonCron = collectRouteFiles(path.join(root, 'app')).filter(
      (file) => !file.includes(`${path.sep}api${path.sep}cron${path.sep}`)
        && !file.endsWith(`${path.sep}api${path.sep}cron${path.sep}route.ts`),
    )
    const publicDurations = new Set<number>()
    for (const file of nonCron) {
      const value = maxDurationFrom(file)
      if (value != null) publicDurations.add(value)
    }
    for (const cronDuration of cronDurations) {
      expect(
        publicDurations.has(cronDuration),
        `cron maxDuration ${cronDuration} collides with a non-cron route`,
      ).toBe(false)
    }
  })
})

describe('recorded vercel build schedule fixture (C1/C2)', () => {
  const fixture = path.join(root, 'lib/cron/fixtures/vercel-schedules-manifest.json')

  it('records five distinct cron .func ids with schedule/v1beta triggers', () => {
    expect(existsSync(fixture)).toBe(true)
    const manifest = JSON.parse(readFileSync(fixture, 'utf8')) as {
      functions: Array<{ id: string; trigger: string; maxDuration?: number }>
    }
    expect(manifest.functions.map((f) => f.id).sort()).toEqual(
      Object.values(EXPECTED_SCHEDULE_FUNCTIONS)
        .map((e) => e.function)
        .sort(),
    )
    for (const fn of manifest.functions) {
      expect(fn.trigger).toBe('schedule/v1beta')
    }
    expect(manifest.functions.map((f) => f.maxDuration).sort()).toEqual(
      [29, 59, 89, 298, 299].sort(),
    )
  })
})
