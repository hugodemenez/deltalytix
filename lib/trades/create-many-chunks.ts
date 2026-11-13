/** Rows per `Trade.createMany` statement. Keeps each INSERT well under the size that was hitting disk. */
export const TRADE_CREATE_MANY_CHUNK_SIZE = 500

export function chunkItems<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`chunk size must be a positive integer, received ${size}`)
  }
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

type CreateManyArgs<T> = {
  data: T[]
  skipDuplicates?: boolean
}

/**
 * Insert `rows` in input order, one chunk at a time.
 * `skipDuplicates` is forwarded unchanged. The returned count is the sum of
 * each chunk. `createMany` is the caller's client, including a transaction
 * client, so the surrounding transaction stays the caller's.
 */
export async function createManyInChunks<T>(options: {
  rows: readonly T[]
  skipDuplicates?: boolean
  chunkSize?: number
  createMany: (args: CreateManyArgs<T>) => Promise<{ count: number }>
}): Promise<{ count: number }> {
  const size = options.chunkSize ?? TRADE_CREATE_MANY_CHUNK_SIZE
  // An empty batch still goes through createMany once. Prisma returns
  // `{ count: 0 }` without a statement, and sync paths rely on that count.
  if (options.rows.length === 0) {
    return options.createMany({
      data: [],
      ...(options.skipDuplicates === undefined
        ? {}
        : { skipDuplicates: options.skipDuplicates }),
    })
  }
  let count = 0
  for (const data of chunkItems(options.rows, size)) {
    const result = await options.createMany({
      data,
      ...(options.skipDuplicates === undefined
        ? {}
        : { skipDuplicates: options.skipDuplicates }),
    })
    count += result.count
  }
  return { count }
}
