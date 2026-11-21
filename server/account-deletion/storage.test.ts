import { describe, expect, it, vi } from "vitest"

import { listTradeImagePathsUnderUser } from "./storage"

describe("listTradeImagePathsUnderUser", () => {
  it("recurses into folders and stays under the user prefix", async () => {
    const storage = {
      list: vi.fn(async (prefix?: string) => {
        if (prefix === "user-1/trades") {
          return {
            data: [{ name: "nested", id: null, metadata: null }],
            error: null,
          }
        }
        if (prefix === "user-1/trades/nested") {
          return {
            data: [
              { name: "shot-1.png", id: "1", metadata: {} },
              { name: "shot-2.png", id: "2", metadata: {} },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
      remove: vi.fn(),
    }

    const result = await listTradeImagePathsUnderUser(
      storage,
      "user-1",
      "user-1/trades",
    )

    expect(result.error).toBeUndefined()
    expect(result.paths).toEqual([
      "user-1/trades/nested/shot-1.png",
      "user-1/trades/nested/shot-2.png",
    ])
  })

  it("paginates across multiple list pages", async () => {
    const storage = {
      list: vi.fn(
        async (
          _prefix?: string,
          options?: { limit?: number; offset?: number },
        ) => {
          const limit = options?.limit ?? 100
          const offset = options?.offset ?? 0
          const total = 150
          const page = Array.from(
            { length: Math.min(limit, Math.max(0, total - offset)) },
            (_, i) => ({
              name: `f-${offset + i}.png`,
              id: `id-${offset + i}`,
              metadata: {},
            }),
          )
          return { data: page, error: null }
        },
      ),
      remove: vi.fn(),
    }

    const result = await listTradeImagePathsUnderUser(
      storage,
      "user-1",
      "user-1/journal",
    )

    expect(result.error).toBeUndefined()
    expect(result.paths).toHaveLength(150)
    expect(result.paths[0]).toBe("user-1/journal/f-0.png")
    expect(result.paths.at(-1)).toBe("user-1/journal/f-149.png")
    expect(storage.list).toHaveBeenCalledTimes(2)
  })

  it("refuses prefixes outside the user id", async () => {
    const storage = {
      list: vi.fn(),
      remove: vi.fn(),
    }

    const result = await listTradeImagePathsUnderUser(
      storage,
      "user-1",
      "other-user/trades",
    )

    expect(result.paths).toEqual([])
    expect(result.error).toMatch(/Refusing to list outside user prefix/)
    expect(storage.list).not.toHaveBeenCalled()
  })
})
