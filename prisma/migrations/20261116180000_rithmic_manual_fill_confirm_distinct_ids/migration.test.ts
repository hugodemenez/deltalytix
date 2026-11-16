import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(path.join(__dirname, "migration.sql"), "utf8")
const statements = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")

describe("rithmic manual fill confirm-distinct list migration", () => {
  it("adds the list column and copies each existing single id into it", () => {
    expect(statements).toContain(
      'ADD COLUMN IF NOT EXISTS "confirmedDistinctFillIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',
    )
    expect(statements).toContain(
      'SET "confirmedDistinctFillIds" = "confirmedDistinctFillIds" || ARRAY["confirmedDistinctFillId"]',
    )
    expect(statements).toContain('"confirmedDistinctFillId" IS NOT NULL')
    expect(statements).toContain('btrim("confirmedDistinctFillId") <> \'\'')
    expect(statements).toContain(
      'NOT ("confirmedDistinctFillId" = ANY ("confirmedDistinctFillIds"))',
    )
  })

  it("keeps the single-id column so a rolling deploy does not drop it", () => {
    expect(statements).not.toMatch(/DROP\s+COLUMN/i)
    expect(statements).toContain('"confirmedDistinctFillId"')
    expect(sql).toMatch(/Do not drop it/i)
  })
})
