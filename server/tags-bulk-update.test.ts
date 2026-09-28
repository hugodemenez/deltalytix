import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const tagsSource = fs.readFileSync(
  path.join(process.cwd(), "server/tags.ts"),
  "utf8",
)
const databaseSource = fs.readFileSync(
  path.join(process.cwd(), "server/database.ts"),
  "utf8",
)
const tradeTagSource = fs.readFileSync(
  path.join(process.cwd(), "app/[locale]/dashboard/components/tables/trade-tag.tsx"),
  "utf8",
)
const tableSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "app/[locale]/dashboard/components/tables/trade-table-review.tsx",
  ),
  "utf8",
)

function functionBody(source: string, exportName: string): string {
  const start = source.indexOf(`export async function ${exportName}`)
  expect(start, `${exportName} must exist`).toBeGreaterThan(-1)
  const nextExport = source.indexOf("\nexport ", start + 1)
  return source.slice(start, nextExport === -1 ? undefined : nextExport)
}

describe("bulkUpdateTradeTagsAction", () => {
  it("updates many trades in one SQL statement scoped to the current user", () => {
    const body = functionBody(tagsSource, "bulkUpdateTradeTagsAction")

    expect(body).toContain("await prisma.$executeRaw")
    expect(body).toContain("array_append(tags, ${tagName})")
    expect(body).toContain("array_remove(tags, ${tagName})")
    expect(body).toContain('AND "userId" = ${user.id}')
    expect(body).not.toContain("updateMany")
    expect(body).not.toMatch(/tags:\s*\{/)
  })

  it("invalidates the same trades cache tag as updateTradesAction", () => {
    const bulkBody = functionBody(tagsSource, "bulkUpdateTradeTagsAction")
    const updateTradesBody = functionBody(databaseSource, "updateTradesAction")

    expect(updateTradesBody).toContain("updateTag(`trades-${userId}`)")
    expect(bulkBody).toContain("updateTag(`trades-${user.id}`)")
    expect(bulkBody).toContain("revalidatePath('/dashboard')")
  })
})

describe("group-row tag merge wiring", () => {
  it("does not overwrite grouped trades with the first trade's tag list", () => {
    expect(tradeTagSource).toContain("updateTradeTags(")
    expect(tradeTagSource).not.toContain("[...trade.tags")
    expect(tradeTagSource).not.toContain("trade.tags.filter")
  })

  it("unions sub-trade tags on grouped table rows", () => {
    expect(tableSource).toContain("unionTagLists")
  })
})
