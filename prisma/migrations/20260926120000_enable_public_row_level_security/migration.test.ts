import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const dir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(dir, "..")
const schema = readFileSync(path.join(migrationsDir, "../schema.prisma"), "utf8")

// Tables added after the first RLS migration get their own follow-up
// `*_row_level_security` migration; together they must cover the schema.
const rlsMigrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.endsWith("_row_level_security"))
  .map((entry) => ({
    name: entry.name,
    sql: readFileSync(path.join(migrationsDir, entry.name, "migration.sql"), "utf8"),
  }))

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

function listedTables(sql: string): string[] {
  const arrayBody = sql.match(/ARRAY\[([\s\S]*?)\]/)?.[1]
  expect(arrayBody).toBeTruthy()
  return [...arrayBody!.matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1])
}

describe("enable public row level security migrations", () => {
  const tables = prismaPublicTableNames(schema)

  it("lists every public table from schema.prisma exactly once", () => {
    expect(tables.length).toBeGreaterThan(0)
    expect(rlsMigrations.map((m) => m.name)).toContain(path.basename(dir))
    const listed = rlsMigrations.flatMap((m) => listedTables(m.sql))
    expect(listed.sort((a, b) => a.localeCompare(b))).toEqual(tables)
  })

  it.each(rlsMigrations)(
    "$name enables RLS without FORCE and without policies or grant changes",
    ({ sql }) => {
      expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/)
      expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY/)
      expect(sql).not.toMatch(/CREATE POLICY/i)
      expect(sql).not.toMatch(/\bGRANT\b/)
      expect(sql).not.toMatch(/\bREVOKE\b/)
      expect(sql).not.toMatch(/\bINSERT\b/i)
      expect(sql).not.toMatch(/\bUPDATE\b/i)
      expect(sql).not.toMatch(/\bDELETE\b/i)
    },
  )
})
