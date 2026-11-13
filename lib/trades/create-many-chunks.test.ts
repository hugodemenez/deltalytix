import { describe, expect, it, vi } from "vitest"
import {
  TRADE_CREATE_MANY_CHUNK_SIZE,
  chunkItems,
  createManyInChunks,
} from "./create-many-chunks"

function rows(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}

describe("chunkItems", () => {
  it("splits on the chunk boundary and keeps order", () => {
    expect(chunkItems(rows(0), 500)).toEqual([])
    expect(chunkItems(rows(500), 500)).toEqual([rows(500)])
    expect(chunkItems(rows(501), 500)).toEqual([rows(500), [500]])
    expect(chunkItems(rows(1200), 500)).toEqual([
      rows(500),
      rows(500).map((value) => value + 500),
      rows(200).map((value) => value + 1000),
    ])
  })

  it("rejects a non-positive chunk size", () => {
    expect(() => chunkItems([1], 0)).toThrow(/positive integer/)
    expect(() => chunkItems([1], 1.5)).toThrow(/positive integer/)
  })
})

type CreateManyArgs = { data: number[]; skipDuplicates?: boolean }

describe("createManyInChunks", () => {
  it("forwards an empty batch once and returns its count", async () => {
    const createMany = vi.fn(async (args: CreateManyArgs) => ({
      count: args.data.length,
    }))
    const result = await createManyInChunks({
      rows: [],
      skipDuplicates: true,
      createMany,
    })
    expect(result).toEqual({ count: 0 })
    expect(createMany).toHaveBeenCalledTimes(1)
    expect(createMany.mock.calls[0][0]).toEqual({
      data: [],
      skipDuplicates: true,
    })
  })

  it("uses 500-row chunks, forwards skipDuplicates, and sums counts", async () => {
    const createMany = vi.fn(async ({ data }: CreateManyArgs) => ({
      count: data.length === 500 ? data.length - 1 : data.length,
    }))
    const input = rows(1200)
    const result = await createManyInChunks({
      rows: input,
      skipDuplicates: true,
      createMany,
    })

    expect(createMany).toHaveBeenCalledTimes(3)
    const sizes = createMany.mock.calls.map((call) => call[0].data.length)
    expect(sizes).toEqual([500, 500, 200])
    expect(createMany.mock.calls[0][0].data[0]).toBe(0)
    expect(createMany.mock.calls[1][0].data[0]).toBe(500)
    expect(createMany.mock.calls[2][0].data.at(-1)).toBe(1199)
    for (const call of createMany.mock.calls) {
      expect(call[0].skipDuplicates).toBe(true)
    }
    expect(result.count).toBe(499 + 499 + 200)
    expect(TRADE_CREATE_MANY_CHUNK_SIZE).toBe(500)
  })

  it("omits skipDuplicates when the caller did not set it", async () => {
    const createMany = vi.fn(async (args: CreateManyArgs) => ({
      count: args.data.length,
    }))
    await createManyInChunks({
      rows: [1, 2],
      createMany,
    })
    expect(createMany.mock.calls[0][0]).toEqual({ data: [1, 2] })
  })

  it("waits for each chunk before starting the next", async () => {
    const seen: number[] = []
    let releaseFirst: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const pending = createManyInChunks({
      rows: [0, 1, 2],
      chunkSize: 1,
      skipDuplicates: true,
      createMany: async ({ data }) => {
        seen.push(data[0])
        if (data[0] === 0) await gate
        return { count: 1 }
      },
    })

    await Promise.resolve()
    expect(seen).toEqual([0])
    releaseFirst()
    await expect(pending).resolves.toEqual({ count: 3 })
    expect(seen).toEqual([0, 1, 2])
  })
})
