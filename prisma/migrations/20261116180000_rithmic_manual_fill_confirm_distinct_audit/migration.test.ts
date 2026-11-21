import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(path.join(__dirname, "migration.sql"), "utf8")
const statements = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")

describe("rithmic manual fill confirm-distinct audit migration", () => {
  it("adds the audit column without rewriting the marker columns", () => {
    expect(statements).toContain(
      'ADD COLUMN IF NOT EXISTS "confirmedDistinctAudit" JSONB NOT NULL DEFAULT \'[]\'::jsonb',
    )
    expect(statements).not.toMatch(/DROP COLUMN/i)
    expect(statements).not.toMatch(/confirmedDistinctFillId/)
    expect(statements).not.toMatch(/UPDATE/i)
  })
})
