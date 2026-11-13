import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
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
    }
  >
}

const EXPECTED_SCHEDULES: Record<string, string> = {
  investing: '0 5 * * 1',
  'renewal-notice': '0 9 * * *',
  'renew-tradovate-token': '*/10 * * * *',
  'daily-sync': '*/5 * * * *',
  'weekly-recap': '0 7 * * 0',
}

describe('vercel.json schedules contract (T1)', () => {
  const config = JSON.parse(
    readFileSync(path.join(root, 'vercel.json'), 'utf8'),
  ) as VercelConfig

  it('has no legacy crons entries', () => {
    expect(config.crons).toBeUndefined()
  })

  it('declares exactly the five production schedules with UTC expressions', () => {
    expect(Object.keys(config.schedules ?? {}).sort()).toEqual(
      Object.keys(EXPECTED_SCHEDULES).sort(),
    )
    for (const [name, expression] of Object.entries(EXPECTED_SCHEDULES)) {
      const entry = config.schedules?.[name]
      expect(entry?.schedule).toBe(expression)
      expect(entry?.timezone).toBe('UTC')
      expect(entry?.function).toEqual(expect.any(String))
      expect(entry?.path).toBeUndefined()
      expect(entry?.topic).toBeUndefined()
    }
  })

  it('maps each schedule function id to an existing App Router route', () => {
    for (const [name, entry] of Object.entries(config.schedules ?? {})) {
      const id = entry.function
      expect(id, `${name} missing function id`).toBeTruthy()
      // Build output ids are `.vercel/output/functions/<id>.func` → App Router
      // `app/<id>/route.ts` (e.g. api/cron/daily-sync, api/cron).
      const routeFile = path.join(root, 'app', `${id}/route.ts`)
      expect(existsSync(routeFile), `${name} function ${id} → ${routeFile}`).toBe(
        true,
      )
      const functionsKey = `app/${id}/route.ts`
      expect(config.functions?.[functionsKey]?.experimentalTriggers).toEqual([
        { type: 'schedule/v1beta' },
      ])
    }
  })
})
