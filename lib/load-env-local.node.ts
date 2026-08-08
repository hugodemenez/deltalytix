import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"

function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

/**
 * Load `.env.local` for local/self-host Node processes.
 *
 * In production, skip by default so a leftover `.env.local` cannot override
 * cloud-injected secrets. Opt in with `LOAD_ENV_LOCAL=1` or `SELF_HOST=true`.
 */
export function loadEnvLocal(): void {
  const isProduction = process.env.NODE_ENV === "production"
  const forceLoad =
    isTruthy(process.env.LOAD_ENV_LOCAL) || isTruthy(process.env.SELF_HOST)

  if (isProduction && !forceLoad) {
    return
  }

  const envLocalPath = resolve(process.cwd(), ".env.local")

  if (!existsSync(envLocalPath)) {
    return
  }

  const previousDatabaseUrl = process.env.DATABASE_URL
  const result = config({ path: envLocalPath, override: true })

  if (result.error) {
    console.warn("[load-env-local] Failed to load .env.local:", result.error.message)
    return
  }

  if (
    previousDatabaseUrl &&
    process.env.DATABASE_URL &&
    previousDatabaseUrl !== process.env.DATABASE_URL
  ) {
    console.info(
      "[load-env-local] Using DATABASE_URL from .env.local (overrode injected shell value)",
    )
  }
}
