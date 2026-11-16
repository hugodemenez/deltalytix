import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(path.join(__dirname, "migration.sql"), "utf8")
const statements = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")

/**
 * The backfill the migration SQL expresses.
 * Existing list entries stay, in order. A non-blank legacy id is appended
 * as stored, once. A blank legacy id and a second run do not change the list.
 * `btrim` only decides whether the scalar is empty; it is not rewritten.
 */
export function backfillConfirmedDistinctFillIds(
  existing: readonly string[] | null | undefined,
  legacy: string | null | undefined,
): string[] {
  const ids = [...(existing ?? [])]
  if (legacy == null || legacy.trim() === "" || ids.includes(legacy)) return ids
  return [...ids, legacy]
}

describe("rithmic manual fill confirm-distinct list migration", () => {
  it("adds the list without dropping the deprecated scalar", () => {
    expect(statements).toContain(
      'ADD COLUMN IF NOT EXISTS "confirmedDistinctFillIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',
    )
    expect(statements).not.toMatch(/DROP COLUMN/i)
    expect(statements).not.toMatch(/confirmedDistinctFillId"\s+TEXT/i)
    expect(statements).toContain(
      '"confirmedDistinctFillIds" = "confirmedDistinctFillIds" || ARRAY["confirmedDistinctFillId"]',
    )
    expect(statements).toContain('btrim("confirmedDistinctFillId") <> \'\'')
    expect(statements).toContain(
      'NOT ("confirmedDistinctFillIds" @> ARRAY["confirmedDistinctFillId"])',
    )
  })

  it("copies a legacy id once and does not drop ids already on the list", () => {
    expect(backfillConfirmedDistinctFillIds([], "1403850")).toEqual(["1403850"])
    expect(backfillConfirmedDistinctFillIds(["1403850"], "1403850")).toEqual(["1403850"])
    expect(backfillConfirmedDistinctFillIds(["1403850"], " 1403850 ")).toEqual([
      "1403850",
      " 1403850 ",
    ])
    expect(backfillConfirmedDistinctFillIds(["1403850", "1402237"], "1403850")).toEqual([
      "1403850",
      "1402237",
    ])
    expect(backfillConfirmedDistinctFillIds(["1402237"], "1403850")).toEqual([
      "1402237",
      "1403850",
    ])
    expect(backfillConfirmedDistinctFillIds(["1403850"], null)).toEqual(["1403850"])
    expect(backfillConfirmedDistinctFillIds(["1403850"], "   ")).toEqual(["1403850"])
    expect(backfillConfirmedDistinctFillIds(null, "1403850")).toEqual(["1403850"])
  })
})
