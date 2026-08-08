import { describe, expect, it } from "vitest"
import { filterSessionScopedCacheTags } from "./cache-tag-scope"

describe("filterSessionScopedCacheTags", () => {
  it("only keeps tags scoped to the session user", () => {
    expect(
      filterSessionScopedCacheTags(
        [
          "trades-session-user",
          "trades-other-user",
          "user-data-session-user",
        ],
        "session-user"
      )
    ).toEqual(["trades-session-user", "user-data-session-user"])
  })

  it("returns empty when nothing is session-scoped", () => {
    expect(
      filterSessionScopedCacheTags(
        ["trades-other-user", "global-tag"],
        "session-user"
      )
    ).toEqual([])
  })
})
