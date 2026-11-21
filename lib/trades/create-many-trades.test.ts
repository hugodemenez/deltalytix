import { describe, expect, it, vi } from "vitest"
import {
  TRADE_CREATE_MANY_CHUNK_SIZE,
  createManyTradesInChunks,
} from "./create-many-trades"

type Row = { id: string }

function rows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `t-${index}`,
  }))
}

describe("createManyTradesInChunks", () => {
  it("uses 500-row chunks", () => {
    expect(TRADE_CREATE_MANY_CHUNK_SIZE).toBe(500)
  })

  it("still calls createMany once for an empty batch and forwards skipDuplicates", async () => {
    const createMany = vi.fn(async () => ({ count: 0 }))
    const result = await createManyTradesInChunks(createMany, {
      data: [],
      skipDuplicates: true,
    })

    expect(result).toEqual({ count: 0 })
    expect(createMany).toHaveBeenCalledTimes(1)
    expect(createMany).toHaveBeenCalledWith({ data: [], skipDuplicates: true })
  })

  it("omits skipDuplicates when the caller did not set it", async () => {
    const createMany = vi.fn(async (args: { data: Row[] }) => ({
      count: args.data.length,
    }))
    await createManyTradesInChunks(createMany, { data: rows(2) })
    expect(createMany).toHaveBeenCalledWith({ data: [{ id: "t-0" }, { id: "t-1" }] })
    expect(createMany.mock.calls[0][0]).not.toHaveProperty("skipDuplicates")
  })

  it("keeps order, sums counts, and splits only past the chunk size", async () => {
    const createMany = vi.fn(async (args: { data: Row[]; skipDuplicates?: boolean }) => ({
      // One conflict per chunk, the way ON CONFLICT DO NOTHING shortens a batch.
      count: Math.max(0, args.data.length - 1),
    }))

    const exactly = rows(TRADE_CREATE_MANY_CHUNK_SIZE)
    const oneChunk = await createManyTradesInChunks(
      createMany,
      { data: exactly, skipDuplicates: true },
      TRADE_CREATE_MANY_CHUNK_SIZE,
    )
    expect(createMany).toHaveBeenCalledTimes(1)
    expect(createMany.mock.calls[0][0].data.map((row: Row) => row.id)).toEqual(
      exactly.map((row) => row.id),
    )
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true)
    expect(oneChunk.count).toBe(TRADE_CREATE_MANY_CHUNK_SIZE - 1)

    createMany.mockClear()
    const overflow = rows(TRADE_CREATE_MANY_CHUNK_SIZE + 1)
    const twoChunks = await createManyTradesInChunks(createMany, {
      data: overflow,
      skipDuplicates: false,
    })

    expect(createMany).toHaveBeenCalledTimes(2)
    const first = createMany.mock.calls[0][0]
    const second = createMany.mock.calls[1][0]
    expect(first.data).toHaveLength(TRADE_CREATE_MANY_CHUNK_SIZE)
    expect(second.data).toEqual([{ id: `t-${TRADE_CREATE_MANY_CHUNK_SIZE}` }])
    expect(first.data.map((row: Row) => row.id)).toEqual(
      overflow.slice(0, TRADE_CREATE_MANY_CHUNK_SIZE).map((row) => row.id),
    )
    expect(first.skipDuplicates).toBe(false)
    expect(second.skipDuplicates).toBe(false)
    expect(twoChunks.count).toBe(TRADE_CREATE_MANY_CHUNK_SIZE - 1 + 0)
  })

  it("rejects a non-positive chunk size before writing", async () => {
    const createMany = vi.fn(async () => ({ count: 1 }))
    await expect(
      createManyTradesInChunks(createMany, { data: rows(1) }, 0),
    ).rejects.toThrow(/chunkSize/)
    expect(createMany).not.toHaveBeenCalled()
  })
})
