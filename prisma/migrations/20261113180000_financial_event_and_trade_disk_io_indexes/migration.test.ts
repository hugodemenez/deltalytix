import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(path.join(__dirname, "migration.sql"), "utf8")
const statements = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")

describe("financial event and trade disk IO migration", () => {
  it("creates both indexes idempotently and bounds the lock", () => {
    expect(statements).toContain(
      'CREATE INDEX IF NOT EXISTS "FinancialEvent_lang_date_idx" ON "public"."FinancialEvent"("lang", "date")',
    )
    expect(statements).toContain(
      'CREATE INDEX IF NOT EXISTS "Trade_userId_accountNumber_entryDate_idx" ON "public"."Trade"("userId", "accountNumber", "entryDate" DESC)',
    )
    expect(statements).toContain("SET lock_timeout = '5s'")
    expect(statements).toContain("SET statement_timeout = '60s'")
    expect(statements).toContain("RESET lock_timeout")
    expect(statements).toContain("RESET statement_timeout")
    expect(statements).not.toMatch(/SET LOCAL/)
    expect(statements).not.toMatch(/CONCURRENTLY/)
  })
})
