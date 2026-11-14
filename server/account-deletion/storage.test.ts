import { describe, expect, it, vi } from "vitest"

import { deleteUserTradeImageObjects, listTradeImagePathsUnderUser } from "./storage"

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


describe("deleteUserTradeImageObjects continues after errors", () => {
  it("removes paths already listed when a later page fails, then continues folders", async () => {
    const removedBatches: string[][] = []
    const storage = {
      list: vi.fn(async (prefix?: string, options?: { offset?: number }) => {
        if (prefix === "user-1/trades") {
          if ((options?.offset ?? 0) === 0) {
            return {
              data: Array.from({ length: 100 }, (_, i) => ({
                name: `early-${i}.png`,
                id: `e-${i}`,
                metadata: {},
              })),
              error: null,
            }
          }
          return { data: null, error: { message: "page-2 boom" } }
        }
        if (prefix === "user-1/journal") {
          return {
            data: [{ name: "j-1.png", id: "j1", metadata: {} }],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
      remove: vi.fn(async (paths: string[]) => {
        removedBatches.push(paths)
        return { error: null }
      }),
    }

    const result = await deleteUserTradeImageObjects(["user-1"], storage)

    expect(result.error).toMatch(/page-2 boom/)
    expect(removedBatches.flat()).toContain("user-1/trades/early-0.png")
    expect(removedBatches.flat()).toContain("user-1/trades/early-99.png")
    expect(removedBatches.flat()).toContain("user-1/journal/j-1.png")
    expect(result.removed).toBe(101)
  })
})
