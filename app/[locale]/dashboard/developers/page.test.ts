import { describe, expect, it } from "vitest"
import DevelopersPage from "./page"

describe("developers page", () => {
  it("permanently redirects each locale to the Connections section in Settings", async () => {
    for (const locale of ["en", "fr"]) {
      await expect(
        DevelopersPage({ params: Promise.resolve({ locale }) }),
      ).rejects.toMatchObject({
        digest: `NEXT_REDIRECT;replace;/${locale}/dashboard/settings#connections;308;`,
      })
    }
  })
})
