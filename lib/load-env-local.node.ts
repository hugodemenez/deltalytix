import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"

export function loadEnvLocal(): void {
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
