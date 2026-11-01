import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

const ROOTS = ["app", "server", "lib"]
const ALLOWED = new Set(["lib/prisma.ts"])
const FORBIDDEN = /new\s+PrismaClient\s*\(/

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "generated" || entry.startsWith(".")) {
      continue
    }
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, files)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) continue
    files.push(full)
  }
  return files
}

describe("Prisma client singleton", () => {
  it("does not construct PrismaClient under app/, server/, or lib/ except lib/prisma.ts", () => {
    const root = process.cwd()
    const offenders: string[] = []
    for (const base of ROOTS) {
      for (const file of walk(join(root, base))) {
        const rel = relative(root, file)
        if (ALLOWED.has(rel)) continue
        if (FORBIDDEN.test(readFileSync(file, "utf8"))) {
          offenders.push(rel)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
