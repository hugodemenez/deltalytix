import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const dir = path.dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(path.join(dir, "migration.sql"), "utf8")
const schema = readFileSync(path.join(dir, "../../schema.prisma"), "utf8")

function prismaPublicTableNames(schemaSource: string): string[] {
  const tables: string[] = []
  const modelBlocks = schemaSource.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)

  for (const match of modelBlocks) {
    const modelName = match[1]
    const body = match[2]
    const mapped = body.match(/@@map\("([^"]+)"\)/)
    tables.push(mapped?.[1] ?? modelName)
  }

  return tables.sort((a, b) => a.localeCompare(b))
}

describe("enable public row level security migration", () => {
  const tables = prismaPublicTableNames(schema)

  it("lists every public table from schema.prisma", () => {
    expect(tables.length).toBeGreaterThan(0)
    const arrayBody = sql.match(/ARRAY\[([\s\S]*?)\]/)?.[1]
    expect(arrayBody).toBeTruthy()
    const listed = [...arrayBody!.matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1])
    expect(listed.sort((a, b) => a.localeCompare(b))).toEqual(tables)
  })

  it("enables RLS without FORCE and without policies or grant changes", () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/)
    expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY/)
    expect(sql).not.toMatch(/CREATE POLICY/i)
    expect(sql).not.toMatch(/\bGRANT\b/)
    expect(sql).not.toMatch(/\bREVOKE\b/)
    expect(sql).not.toMatch(/\bINSERT\b/i)
    expect(sql).not.toMatch(/\bUPDATE\b/i)
    expect(sql).not.toMatch(/\bDELETE\b/i)
  })
})
