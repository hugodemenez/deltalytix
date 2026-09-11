import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const accountsSource = fs.readFileSync(
  path.join(process.cwd(), "server/accounts.ts"),
  "utf8",
)

function functionBody(source: string, exportName: string): string {
  const start = source.indexOf(`export async function ${exportName}`)
  expect(start, `${exportName} must exist`).toBeGreaterThan(-1)
  const nextExport = source.indexOf("\nexport ", start + 1)
  return source.slice(start, nextExport === -1 ? undefined : nextExport)
}

describe("deleteTradesByIdsAction cache invalidation", () => {
  it("invalidates the same trade/user tags as sibling account mutations", () => {
    const deleteBody = functionBody(accountsSource, "deleteTradesByIdsAction")
    const siblingBody = functionBody(accountsSource, "removeAccountsFromTradesAction")

    expect(deleteBody).toContain("await prisma.trade.deleteMany")
    expect(deleteBody.indexOf("updateTag(`trades-${userId}`)")).toBeGreaterThan(
      deleteBody.indexOf("await prisma.trade.deleteMany"),
    )
    expect(deleteBody).toContain("updateTag(`user-data-${userId}`)")
    expect(deleteBody).toContain("revalidateTag(`trades-${userId}`")
    expect(deleteBody).toContain("revalidateTag(`user-data-${userId}`")

    expect(siblingBody).toContain("updateTag(`trades-${userId}`)")
    expect(siblingBody).toContain("updateTag(`user-data-${userId}`)")
  })
})
